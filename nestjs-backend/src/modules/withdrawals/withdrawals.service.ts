import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  WithdrawalRequest,
  WithdrawalStatus,
} from './withdrawal-request.entity';
import { Payment, PaymentStatus } from '../payments/payment.entity';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { UpdateWithdrawalStatusDto } from './dto/update-status.dto';

@Injectable()
export class WithdrawalsService {
  constructor(
    @InjectRepository(WithdrawalRequest)
    private readonly repo: Repository<WithdrawalRequest>,
    @InjectRepository(Payment)
    private readonly paymentsRepo: Repository<Payment>,
  ) {}

  /**
   * Available balance =
   *   SUM(completed payments to worker) - SUM(withdrawals pending/approved/completed)
   */
  async getAvailableBalanceMinor(workerId: string): Promise<number> {
    const earned = await this.paymentsRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amountMinor), 0)', 'sum')
      .where('p.workerId = :workerId', { workerId })
      .andWhere('p.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne<{ sum: string | number }>();

    const reserved = await this.repo
      .createQueryBuilder('w')
      .select('COALESCE(SUM(w.amountMinor), 0)', 'sum')
      .where('w.workerId = :workerId', { workerId })
      .andWhere('w.status IN (:...statuses)', {
        statuses: [
          WithdrawalStatus.PENDING,
          WithdrawalStatus.APPROVED,
          WithdrawalStatus.COMPLETED,
        ],
      })
      .getRawOne<{ sum: string | number }>();

    const earnedNum = Number(earned?.sum ?? 0);
    const reservedNum = Number(reserved?.sum ?? 0);
    return earnedNum - reservedNum;
  }

  async createRequest(
    workerId: string,
    dto: CreateWithdrawalDto,
  ): Promise<WithdrawalRequest> {
    const available = await this.getAvailableBalanceMinor(workerId);
    if (dto.amountMinor > available) {
      throw new BadRequestException(
        `Yetersiz bakiye. Mevcut: ${(available / 100).toFixed(2)} TL`,
      );
    }
    const entity = this.repo.create({
      workerId,
      amountMinor: dto.amountMinor,
      iban: dto.iban.toUpperCase(),
      accountHolderName: dto.accountHolderName.trim(),
      workerNote: dto.workerNote ?? null,
      status: WithdrawalStatus.PENDING,
    });
    return this.repo.save(entity);
  }

  async listForWorker(
    workerId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: WithdrawalRequest[]; total: number; page: number; limit: number }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const [items, total] = await this.repo.findAndCount({
      where: { workerId },
      order: { requestedAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    return { items, total, page: safePage, limit: safeLimit };
  }

  async listForAdmin(
    statusFilter: WithdrawalStatus | undefined,
    page = 1,
    limit = 50,
  ): Promise<{ items: WithdrawalRequest[]; total: number; page: number; limit: number }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(200, Math.max(1, limit));
    const where = statusFilter ? { status: statusFilter } : {};
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { requestedAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    return { items, total, page: safePage, limit: safeLimit };
  }

  async updateStatus(
    adminId: string,
    id: string,
    dto: UpdateWithdrawalStatusDto,
  ): Promise<WithdrawalRequest> {
    const wr = await this.repo.findOne({ where: { id } });
    if (!wr) throw new NotFoundException('Çekme talebi bulunamadı');

    const valid = this.isValidTransition(wr.status, dto.status);
    if (!valid) {
      throw new BadRequestException(
        `Geçersiz durum geçişi: ${wr.status} → ${dto.status}`,
      );
    }
    wr.status = dto.status;
    wr.processedAt = new Date();
    wr.processedBy = adminId;
    if (dto.adminNote !== undefined) wr.adminNote = dto.adminNote;
    return this.repo.save(wr);
  }

  private isValidTransition(
    from: WithdrawalStatus,
    to: WithdrawalStatus,
  ): boolean {
    if (from === WithdrawalStatus.PENDING) {
      return (
        to === WithdrawalStatus.APPROVED || to === WithdrawalStatus.REJECTED
      );
    }
    if (from === WithdrawalStatus.APPROVED) {
      return to === WithdrawalStatus.COMPLETED;
    }
    return false;
  }
}
