import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEscrow, EscrowStatus } from './payment-escrow.entity';
import { tlToMinor, pctOfMinor, subMinor } from '../../common/money.util';
import { FeeService, FeeBreakdown } from './fee.service';
import { IyzipayService } from './iyzipay.service';

export const ALLOWED_TRANSITIONS: Record<EscrowStatus, EscrowStatus[]> = {
  [EscrowStatus.HELD]: [
    EscrowStatus.RELEASED,
    EscrowStatus.REFUNDED,
    EscrowStatus.DISPUTED,
    EscrowStatus.PARTIAL_REFUND,
  ],
  [EscrowStatus.DISPUTED]: [
    EscrowStatus.RELEASED,
    EscrowStatus.REFUNDED,
    EscrowStatus.PARTIAL_REFUND,
  ],
  [EscrowStatus.RELEASED]: [],
  [EscrowStatus.REFUNDED]: [],
  [EscrowStatus.PARTIAL_REFUND]: [],
};

export interface HoldArgs {
  jobId: string;
  offerId: string;
  amount: number;
  customerId: string;
  taskerId: string;
  paymentRef?: string;
  paymentProvider?: string;
  paymentToken?: string;
}

export interface InitiateArgs {
  jobId: string;
  offerId: string;
  amount: number;
  customerId: string;
  taskerId: string;
  paymentToken?: string;
  /** Buyer details forwarded to iyzipay checkout form (optional). */
  buyer?: {
    name?: string;
    surname?: string;
    email?: string;
    gsmNumber?: string;
    ip?: string;
    city?: string;
  };
}

export interface InitiateResult {
  escrow: PaymentEscrow;
  /** iyzipay hosted payment page URL (null only on hard failure). */
  paymentInitUrl: string | null;
  /** iyzipay checkout form token. */
  paymentToken: string | null;
  /** inline checkout form snippet (alternative to redirect). */
  checkoutFormContent: string | null;
  mock: boolean;
}

export function getPlatformFeeRate(): number {
  const raw = process.env.PLATFORM_FEE_RATE;
  if (!raw) return 0.15;
  const parsed = parseFloat(raw);
  if (isNaN(parsed) || parsed < 0 || parsed > 1) return 0.15;
  return parsed;
}

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    @InjectRepository(PaymentEscrow)
    private readonly repo: Repository<PaymentEscrow>,
    private readonly feeService: FeeService,
    private readonly iyzipay: IyzipayService,
  ) {}

  isValidTransition(from: EscrowStatus, to: EscrowStatus): boolean {
    const allowed = ALLOWED_TRANSITIONS[from] ?? [];
    return allowed.includes(to);
  }

  /**
   * Phase 169 — transparent service-fee breakdown for an escrow's gross amount.
   * Surfaced to customers so they see exactly what the worker nets vs platform fee.
   */
  feeBreakdownFor(escrow: Pick<PaymentEscrow, 'amount'>): FeeBreakdown {
    return this.feeService.calculateFee(escrow.amount);
  }

  /** Convenience: { ...escrow, feeBreakdown }. Use in customer-facing responses. */
  withFeeBreakdown<T extends PaymentEscrow>(
    escrow: T,
  ): T & { feeBreakdown: FeeBreakdown } {
    return { ...escrow, feeBreakdown: this.feeBreakdownFor(escrow) };
  }

  private isAdmin(role?: string): boolean {
    return role === 'admin';
  }

  private isParty(escrow: PaymentEscrow, userId: string): boolean {
    return escrow.customerId === userId || escrow.taskerId === userId;
  }

  async hold(args: HoldArgs): Promise<PaymentEscrow> {
    if (!args.jobId || !args.offerId || !args.customerId || !args.taskerId) {
      throw new BadRequestException('Missing required escrow parameters');
    }
    if (!(args.amount > 0)) {
      throw new BadRequestException('Escrow amount must be positive');
    }

    // Phase 174c — Integer minor sync (kuruş). Fee pct via FeeService (Phase 169).
    const amountMinor = tlToMinor(args.amount) ?? 0;
    const feePct = Math.round(this.feeService.getFeePct());
    const platformFeeMinor = pctOfMinor(amountMinor, feePct);
    const workerPayoutMinor = subMinor(amountMinor, platformFeeMinor);

    const escrow = this.repo.create({
      jobId: args.jobId,
      offerId: args.offerId,
      amount: args.amount,
      amountMinor,
      platformFeeMinor,
      workerPayoutMinor,
      customerId: args.customerId,
      taskerId: args.taskerId,
      paymentRef: args.paymentRef ?? null,
      paymentProvider: args.paymentProvider ?? 'iyzipay',
      paymentToken: args.paymentToken ?? null,
      status: EscrowStatus.HELD,
      currency: 'TRY',
    });
    return this.repo.save(escrow);
  }

  /**
   * Phase 175 — Initiate escrow + real iyzipay checkout form.
   *
   * Creates the escrow record (status=HELD, paymentStatus='pending'), then asks
   * iyzipay for a Checkout Form (token + hosted payment page URL). The customer
   * pays on iyzipay's page; iyzipay POSTs the token back to our callback which
   * calls {@link confirmByToken}. Returns `paymentInitUrl` (no longer null).
   *
   * Note: HELD is the only "live" status in the state machine; paymentStatus
   * carries the pre-capture/captured/failed sub-state.
   */
  async initiate(args: InitiateArgs): Promise<InitiateResult> {
    const escrow = await this.hold({
      jobId: args.jobId,
      offerId: args.offerId,
      amount: args.amount,
      customerId: args.customerId,
      taskerId: args.taskerId,
      paymentProvider: 'iyzipay',
      paymentToken: args.paymentToken,
    });
    escrow.paymentStatus = 'pending';

    try {
      const cf = await this.iyzipay.createCheckoutForm({
        refId: escrow.id,
        gross: escrow.amount,
        callbackUrl: IyzipayService.callbackUrl(),
        buyer: args.buyer
          ? { ...args.buyer, id: escrow.customerId }
          : { id: escrow.customerId },
        itemName: `Hizmet #${escrow.jobId}`,
      });
      escrow.paymentToken = cf.token;
      await this.repo.save(escrow);
      return {
        escrow,
        paymentInitUrl: cf.paymentPageUrl,
        paymentToken: cf.token,
        checkoutFormContent: cf.checkoutFormContent,
        mock: cf.mock,
      };
    } catch (err) {
      this.logger.error(
        `iyzipay checkout init failed for escrow ${escrow.id}: ${(err as Error).message}`,
      );
      escrow.paymentStatus = 'failed';
      await this.repo.save(escrow);
      return {
        escrow,
        paymentInitUrl: null,
        paymentToken: escrow.paymentToken ?? null,
        checkoutFormContent: null,
        mock: this.iyzipay.mockMode,
      };
    }
  }

  /**
   * Phase 175 — iyzipay callback. The token comes from iyzipay's POST after the
   * customer pays. We MUST re-verify it server-side with retrieveCheckout — we
   * never trust a client-supplied "success" flag.
   */
  async confirmByToken(paymentToken: string): Promise<PaymentEscrow> {
    if (!paymentToken) throw new BadRequestException('Missing payment token');
    const escrow = await this.repo.findOne({ where: { paymentToken } });
    if (!escrow) throw new NotFoundException('Escrow not found for token');

    const result = await this.iyzipay.retrieveCheckout(paymentToken);
    if (result.status === 'SUCCESS') {
      escrow.paymentRef = result.paymentId ?? escrow.paymentRef;
      escrow.paymentTxnId = result.paymentTransactionId ?? escrow.paymentTxnId;
      escrow.paymentStatus = 'paid';
      if (escrow.status !== EscrowStatus.HELD) {
        escrow.status = EscrowStatus.HELD;
      }
    } else {
      escrow.paymentStatus = 'failed';
    }
    return this.repo.save(escrow);
  }

  /**
   * Phase 169 — legacy confirm (manual paymentRef supply). Kept for compatibility.
   */
  async confirm(
    paymentToken: string,
    paymentRef: string,
  ): Promise<PaymentEscrow> {
    const escrow = await this.repo.findOne({ where: { paymentToken } });
    if (!escrow) throw new NotFoundException('Escrow not found for token');
    escrow.paymentRef = paymentRef;
    escrow.paymentStatus = 'paid';
    if (escrow.status !== EscrowStatus.HELD) {
      escrow.status = EscrowStatus.HELD;
    }
    return this.repo.save(escrow);
  }

  /**
   * Phase 169 — admin manual resolve: release | refund | split.
   * splitRatio: 0..1, fraction going to worker; rest refunded.
   */
  async adminResolve(
    escrowId: string,
    action: 'release' | 'refund' | 'split',
    adminId: string,
    adminRole: string,
    options?: { splitRatio?: number; reason?: string; adminNote?: string },
  ): Promise<PaymentEscrow> {
    if (!this.isAdmin(adminRole)) {
      throw new ForbiddenException('Admin role required');
    }
    const escrow = await this.repo.findOne({ where: { id: escrowId } });
    if (!escrow) throw new NotFoundException('Escrow not found');

    if (action === 'release') {
      return this.release(escrowId, adminId, options?.reason, adminRole);
    }
    if (action === 'refund') {
      return this.refund(
        escrowId,
        adminId,
        escrow.amount,
        options?.reason,
        adminRole,
      );
    }
    // split
    const ratio = options?.splitRatio ?? 0.5;
    if (ratio < 0 || ratio > 1) {
      throw new BadRequestException('splitRatio must be between 0 and 1');
    }
    if (
      !this.isValidTransition(escrow.status, EscrowStatus.PARTIAL_REFUND)
    ) {
      throw new BadRequestException(
        `Cannot split from status ${escrow.status}`,
      );
    }
    const workerShare = Math.round(escrow.amount * ratio * 100) / 100;
    const refundShare = Math.round((escrow.amount - workerShare) * 100) / 100;
    const feeRate = getPlatformFeeRate() * 100;
    escrow.platformFeePct = feeRate;
    escrow.platformFeeAmount =
      Math.round(workerShare * feeRate) / 100;
    escrow.taskerNetAmount = workerShare - escrow.platformFeeAmount;
    escrow.refundAmount = refundShare;

    // Phase 174c — Integer minor sync
    const workerShareMinor = tlToMinor(workerShare) ?? 0;
    const platformFeeMinor = pctOfMinor(workerShareMinor, Math.round(feeRate));
    escrow.platformFeeMinor = platformFeeMinor;
    escrow.workerPayoutMinor = subMinor(workerShareMinor, platformFeeMinor);
    escrow.status = EscrowStatus.PARTIAL_REFUND;
    escrow.releasedAt = new Date();
    escrow.refundedAt = new Date();
    escrow.releaseReason = options?.reason ?? 'admin split';
    escrow.refundReason = options?.adminNote ?? null;
    return this.repo.save(escrow);
  }

  /**
   * Phase 169 — combined "my escrows" (customer ∪ tasker).
   */
  async listMy(userId: string): Promise<PaymentEscrow[]> {
    return this.repo
      .createQueryBuilder('e')
      .where('e.customerId = :uid OR e.taskerId = :uid', { uid: userId })
      .orderBy('e.createdAt', 'DESC')
      .getMany();
  }

  async release(
    escrowId: string,
    byUserId: string,
    reason?: string,
    byUserRole?: string,
  ): Promise<PaymentEscrow> {
    const escrow = await this.repo.findOne({ where: { id: escrowId } });
    if (!escrow) throw new NotFoundException('Escrow not found');

    const isCustomer = escrow.customerId === byUserId;
    if (!isCustomer && !this.isAdmin(byUserRole)) {
      throw new ForbiddenException('Only customer or admin may release escrow');
    }

    if (!this.isValidTransition(escrow.status, EscrowStatus.RELEASED)) {
      throw new BadRequestException(
        `Cannot release from status ${escrow.status}`,
      );
    }

    // Single source of truth: FeeService (PLATFORM_FEE_RATE 0..1 wins, else PLATFORM_FEE_PCT, default 10).
    const fb = this.feeService.calculateFee(escrow.amount);
    const pct = fb.feePct;
    escrow.platformFeePct = pct;
    escrow.platformFeeAmount = fb.feeAmount;
    escrow.taskerNetAmount = fb.workerNet;

    // Phase 174c — Integer minor sync
    const amountMinor = escrow.amountMinor || tlToMinor(escrow.amount) || 0;
    escrow.amountMinor = amountMinor;
    escrow.platformFeeMinor = pctOfMinor(amountMinor, Math.round(pct));
    escrow.workerPayoutMinor = subMinor(amountMinor, escrow.platformFeeMinor);

    escrow.status = EscrowStatus.RELEASED;
    escrow.releasedAt = new Date();
    escrow.releaseReason = reason ?? null;
    return this.repo.save(escrow);
  }

  async refund(
    escrowId: string,
    byUserId: string,
    amount?: number,
    reason?: string,
    byUserRole?: string,
  ): Promise<PaymentEscrow> {
    const escrow = await this.repo.findOne({ where: { id: escrowId } });
    if (!escrow) throw new NotFoundException('Escrow not found');

    if (!this.isAdmin(byUserRole) && byUserId !== 'system') {
      throw new ForbiddenException('Only admin or system may refund escrow');
    }

    const refundAmount = amount ?? escrow.amount;
    if (refundAmount <= 0 || refundAmount > escrow.amount) {
      throw new BadRequestException('Invalid refund amount');
    }

    const isPartial = refundAmount < escrow.amount;
    const target = isPartial
      ? EscrowStatus.PARTIAL_REFUND
      : EscrowStatus.REFUNDED;

    if (!this.isValidTransition(escrow.status, target)) {
      throw new BadRequestException(
        `Cannot refund from status ${escrow.status}`,
      );
    }

    // Phase 175 — best-effort iyzipay refund. If it fails the escrow state still
    // transitions; we flag the record + log so an admin can reconcile manually.
    if (escrow.paymentProvider === 'iyzipay' && escrow.paymentTxnId) {
      try {
        const r = await this.iyzipay.refund({
          paymentTransactionId: escrow.paymentTxnId,
          price: refundAmount,
        });
        if (r.status === 'success') {
          escrow.paymentStatus = 'refunded';
        } else {
          escrow.refundNeedsAttention = true;
          this.logger.warn(
            `iyzipay refund failed for escrow ${escrow.id}: ${r.error ?? 'unknown'} — flagged for admin`,
          );
        }
      } catch (err) {
        escrow.refundNeedsAttention = true;
        this.logger.warn(
          `iyzipay refund threw for escrow ${escrow.id}: ${(err as Error).message} — flagged for admin`,
        );
      }
    }

    escrow.status = target;
    escrow.refundedAt = new Date();
    escrow.refundReason = reason ?? null;
    escrow.refundAmount = refundAmount;
    return this.repo.save(escrow);
  }

  async dispute(
    escrowId: string,
    byUserId: string,
    reason?: string,
  ): Promise<PaymentEscrow> {
    const escrow = await this.repo.findOne({ where: { id: escrowId } });
    if (!escrow) throw new NotFoundException('Escrow not found');

    if (!this.isParty(escrow, byUserId)) {
      throw new ForbiddenException('Only parties may dispute the escrow');
    }

    if (!this.isValidTransition(escrow.status, EscrowStatus.DISPUTED)) {
      throw new BadRequestException(
        `Cannot dispute from status ${escrow.status}`,
      );
    }

    escrow.status = EscrowStatus.DISPUTED;
    escrow.disputedAt = new Date();
    escrow.disputeReason = reason ?? null;
    return this.repo.save(escrow);
  }

  async getById(
    escrowId: string,
    requesterId: string,
    requesterRole?: string,
  ): Promise<PaymentEscrow> {
    const escrow = await this.repo.findOne({ where: { id: escrowId } });
    if (!escrow) throw new NotFoundException('Escrow not found');

    if (!this.isParty(escrow, requesterId) && !this.isAdmin(requesterRole)) {
      throw new ForbiddenException('Not allowed to view this escrow');
    }
    return escrow;
  }

  async getByJob(
    jobId: string,
    requesterId?: string,
    requesterRole?: string,
  ): Promise<PaymentEscrow | null> {
    const escrow = await this.repo.findOne({
      where: { jobId },
      order: { createdAt: 'DESC' },
    });
    if (!escrow) return null;

    if (requesterId !== undefined) {
      if (
        !this.isParty(escrow, requesterId) &&
        !this.isAdmin(requesterRole)
      ) {
        throw new ForbiddenException('Not allowed to view this escrow');
      }
    }
    return escrow;
  }

  async listForCustomer(customerId: string): Promise<PaymentEscrow[]> {
    return this.repo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  async listForTasker(taskerId: string): Promise<PaymentEscrow[]> {
    return this.repo.find({
      where: { taskerId },
      order: { createdAt: 'DESC' },
    });
  }
}
