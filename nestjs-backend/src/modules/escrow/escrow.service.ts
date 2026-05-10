import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEscrow, EscrowStatus } from './payment-escrow.entity';
import { tlToMinor, pctOfMinor, subMinor } from '../../common/money.util';

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
  constructor(
    @InjectRepository(PaymentEscrow)
    private readonly repo: Repository<PaymentEscrow>,
  ) {}

  isValidTransition(from: EscrowStatus, to: EscrowStatus): boolean {
    const allowed = ALLOWED_TRANSITIONS[from] ?? [];
    return allowed.includes(to);
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

    // Phase 174c — Integer minor sync (kuruş)
    const amountMinor = tlToMinor(args.amount) ?? 0;
    const feePct = Math.round(getPlatformFeeRate() * 100);
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
   * Phase 169 — Initiate escrow (status=HELD on Iyzipay 3D init).
   * Note: pending status is not in current state-machine; we treat this as a
   * pre-hold record carrying the paymentToken until /confirm fires.
   */
  async initiate(args: InitiateArgs): Promise<PaymentEscrow> {
    return this.hold({
      jobId: args.jobId,
      offerId: args.offerId,
      amount: args.amount,
      customerId: args.customerId,
      taskerId: args.taskerId,
      paymentProvider: 'iyzipay',
      paymentToken: args.paymentToken,
    });
  }

  /**
   * Phase 169 — Iyzipay callback confirms payment captured.
   * Updates paymentRef + ensures status=HELD.
   */
  async confirm(
    paymentToken: string,
    paymentRef: string,
  ): Promise<PaymentEscrow> {
    const escrow = await this.repo.findOne({ where: { paymentToken } });
    if (!escrow) throw new NotFoundException('Escrow not found for token');
    escrow.paymentRef = paymentRef;
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

    // PLATFORM_FEE_RATE (0..1) takes precedence over legacy PLATFORM_FEE_PCT.
    const pct = process.env.PLATFORM_FEE_RATE
      ? getPlatformFeeRate() * 100
      : parseFloat(process.env.PLATFORM_FEE_PCT ?? '15') || 15;
    escrow.platformFeePct = pct;
    escrow.platformFeeAmount = Math.round((escrow.amount * pct) / 100 * 100) / 100;
    escrow.taskerNetAmount = escrow.amount - escrow.platformFeeAmount;

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

    escrow.status = target;
    escrow.refundedAt = new Date();
    escrow.refundReason = reason ?? null;
    if (isPartial) {
      escrow.refundAmount = refundAmount;
    } else {
      escrow.refundAmount = refundAmount;
    }
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
