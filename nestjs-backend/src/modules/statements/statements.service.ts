import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { PaymentEscrow, EscrowStatus } from '../escrow/payment-escrow.entity';

export interface LineItem {
  date: Date;
  jobId: string;
  role: 'customer' | 'tasker';
  amount: number;
  commission: number;
  net: number;
  status: string;
}

export interface MonthlyStatement {
  period: { year: number; month: number };
  asCustomer: { count: number; totalSpent: number };
  asTasker: { count: number; totalGross: number; totalCommission: number; totalNet: number };
  lineItems: LineItem[];
}

@Injectable()
export class StatementsService {
  constructor(
    @InjectRepository(PaymentEscrow)
    private readonly escrowRepo: Repository<PaymentEscrow>,
  ) {}

  async getMonthly(userId: string, year: number, month: number): Promise<MonthlyStatement> {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 1, 0, 0, 0, 0);

    const [customerSide, taskerSide] = await Promise.all([
      this.escrowRepo.find({
        where: {
          customerId: userId,
          status: EscrowStatus.RELEASED,
          releasedAt: Between(start, end),
        },
      }),
      this.escrowRepo.find({
        where: {
          taskerId: userId,
          status: EscrowStatus.RELEASED,
          releasedAt: Between(start, end),
        },
      }),
    ]);

    const totalSpent = customerSide.reduce((s, e) => s + (e.amount ?? 0), 0);
    const totalGross = taskerSide.reduce((s, e) => s + (e.amount ?? 0), 0);
    const totalCommission = taskerSide.reduce((s, e) => s + (e.platformFeeAmount ?? 0), 0);
    const totalNet = taskerSide.reduce((s, e) => s + (e.taskerNetAmount ?? 0), 0);

    const lineItems: LineItem[] = [
      ...customerSide.map<LineItem>((e) => ({
        date: e.releasedAt as Date,
        jobId: e.jobId,
        role: 'customer',
        amount: e.amount ?? 0,
        commission: e.platformFeeAmount ?? 0,
        net: e.taskerNetAmount ?? 0,
        status: e.status,
      })),
      ...taskerSide.map<LineItem>((e) => ({
        date: e.releasedAt as Date,
        jobId: e.jobId,
        role: 'tasker',
        amount: e.amount ?? 0,
        commission: e.platformFeeAmount ?? 0,
        net: e.taskerNetAmount ?? 0,
        status: e.status,
      })),
    ].sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

    return {
      period: { year, month },
      asCustomer: { count: customerSide.length, totalSpent },
      asTasker: {
        count: taskerSide.length,
        totalGross,
        totalCommission,
        totalNet,
      },
      lineItems,
    };
  }

  async getMonthlyCsv(userId: string, year: number, month: number): Promise<string> {
    const data = await this.getMonthly(userId, year, month);
    const BOM = '﻿';
    const header = 'Tarih,Rol,İş ID,Tutar (₺),Komisyon (₺),Net (₺),Durum';
    const rows = data.lineItems.map((li) => {
      const date = li.date ? new Date(li.date).toISOString().slice(0, 10) : '';
      const roleTr = li.role === 'customer' ? 'Müşteri' : 'Usta';
      return [
        date,
        roleTr,
        li.jobId,
        li.amount.toFixed(2),
        li.commission.toFixed(2),
        li.net.toFixed(2),
        li.status,
      ].join(',');
    });
    return BOM + [header, ...rows].join('\n');
  }
}
