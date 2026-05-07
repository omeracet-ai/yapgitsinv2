import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEscrow, EscrowStatus } from './payment-escrow.entity';

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

    const escrow = this.repo.create({
      jobId: args.jobId,
      offerId: args.offerId,
      amount: args.amount,
      customerId: args.customerId,
      taskerId: args.taskerId,
      paymentRef: args.paymentRef ?? null,
      status: EscrowStatus.HELD,
      currency: 'TRY',
    });
    return this.repo.save(escrow);
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
