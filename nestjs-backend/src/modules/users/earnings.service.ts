import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStatus } from '../jobs/job.entity';
import { Offer, OfferStatus } from '../jobs/offer.entity';
import { Booking, BookingStatus } from '../bookings/booking.entity';

interface MonthlyPoint {
  month: string; // YYYY-MM
  earnings: number;
  count: number;
}
interface CategoryAgg {
  category: string;
  earnings: number;
  count: number;
}

export interface EarningsPayload {
  totalEarnings: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  growthPercent: number;
  completedJobsCount: number;
  thisMonthCount: number;
  monthlySeries: MonthlyPoint[];
  topCategories: CategoryAgg[];
  averageJobValue: number;
  // Phase 169 — Airtasker-style service fee transparency.
  /** Platform fee percentage applied to released funds. */
  platformFeePct: number;
  /** Total platform service fee deducted across all completed jobs (TRY). */
  platformFeesPaid: number;
  /** Net earnings after the platform service fee (workerNet sum) (TRY). */
  netEarnings: number;
  /** This-month net earnings after the platform service fee (TRY). */
  thisMonthNetEarnings: number;
}

/**
 * Resolve platform fee pct (0..100). Mirrors escrow FeeService — `PLATFORM_FEE_RATE`
 * (0..1) wins if set, else `PLATFORM_FEE_PCT` (default 10).
 */
function resolveFeePct(): number {
  const rate = process.env.PLATFORM_FEE_RATE;
  if (rate !== undefined && rate !== '') {
    const p = parseFloat(rate);
    if (!Number.isNaN(p) && p >= 0 && p <= 1) return Math.round(p * 10000) / 100;
  }
  const pct = parseFloat(process.env.PLATFORM_FEE_PCT ?? '10');
  return Number.isNaN(pct) || pct < 0 || pct > 100 ? 10 : pct;
}

@Injectable()
export class EarningsService {
  constructor(
    @InjectRepository(Job) private jobsRepo: Repository<Job>,
    @InjectRepository(Offer) private offersRepo: Repository<Offer>,
    @InjectRepository(Booking) private bookingsRepo: Repository<Booking>,
  ) {}

  private ym(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  async getEarnings(userId: string, monthsRaw: number): Promise<EarningsPayload> {
    const months = Math.min(24, Math.max(1, Math.floor(monthsRaw) || 6));

    // Worker earnings from accepted offers on completed jobs
    const offerRows = await this.offersRepo
      .createQueryBuilder('offer')
      .innerJoinAndSelect('offer.job', 'job')
      .where('offer.userId = :uid', { uid: userId })
      .andWhere('offer.status = :os', { os: OfferStatus.ACCEPTED })
      .andWhere('job.status = :js', { js: JobStatus.COMPLETED })
      .getMany();

    // Worker earnings from completed bookings
    const bookingRows = await this.bookingsRepo.find({
      where: { workerId: userId, status: BookingStatus.COMPLETED },
    });

    type Item = { date: Date; amount: number; category: string };
    const items: Item[] = [];
    for (const o of offerRows) {
      const price = Number(o.price) || 0;
      if (price <= 0) continue;
      items.push({
        date: o.job?.updatedAt || o.updatedAt,
        amount: price,
        category: o.job?.category || 'Diğer',
      });
    }
    for (const b of bookingRows) {
      const price = Number(b.agreedPrice) || 0;
      if (price <= 0) continue;
      items.push({
        date: b.updatedAt,
        amount: price,
        category: b.category || 'Diğer',
      });
    }

    const now = new Date();
    const thisMonthKey = this.ym(now);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = this.ym(lastMonthDate);

    let total = 0;
    let thisMonth = 0;
    let lastMonth = 0;
    let thisMonthCount = 0;
    const monthMap = new Map<string, MonthlyPoint>();
    const catMap = new Map<string, CategoryAgg>();

    // Seed last N months
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = this.ym(d);
      monthMap.set(key, { month: key, earnings: 0, count: 0 });
    }

    for (const it of items) {
      total += it.amount;
      const key = this.ym(it.date);
      if (key === thisMonthKey) {
        thisMonth += it.amount;
        thisMonthCount++;
      }
      if (key === lastMonthKey) lastMonth += it.amount;

      if (monthMap.has(key)) {
        const mp = monthMap.get(key)!;
        mp.earnings += it.amount;
        mp.count += 1;
      }

      const cat = it.category;
      const cAgg = catMap.get(cat) || { category: cat, earnings: 0, count: 0 };
      cAgg.earnings += it.amount;
      cAgg.count += 1;
      catMap.set(cat, cAgg);
    }

    const completedJobsCount = items.length;
    const growthPercent =
      lastMonth > 0
        ? Math.round(((thisMonth - lastMonth) / lastMonth) * 1000) / 10
        : thisMonth > 0
          ? 100
          : 0;
    const averageJobValue =
      completedJobsCount > 0
        ? Math.round((total / completedJobsCount) * 100) / 100
        : 0;

    const monthlySeries = Array.from(monthMap.values()).map((m) => ({
      month: m.month,
      earnings: Math.round(m.earnings * 100) / 100,
      count: m.count,
    }));
    const topCategories = Array.from(catMap.values())
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5)
      .map((c) => ({
        category: c.category,
        earnings: Math.round(c.earnings * 100) / 100,
        count: c.count,
      }));

    const feePct = resolveFeePct();
    const totalEarnings = Math.round(total * 100) / 100;
    const thisMonthEarnings = Math.round(thisMonth * 100) / 100;
    const platformFeesPaid = Math.round(totalEarnings * feePct) / 100;
    const netEarnings =
      Math.round((totalEarnings - platformFeesPaid) * 100) / 100;
    const thisMonthNetEarnings =
      Math.round(thisMonthEarnings * (100 - feePct)) / 100;

    return {
      totalEarnings,
      thisMonthEarnings,
      lastMonthEarnings: Math.round(lastMonth * 100) / 100,
      growthPercent,
      completedJobsCount,
      thisMonthCount,
      monthlySeries,
      topCategories,
      averageJobValue,
      platformFeePct: feePct,
      platformFeesPaid,
      netEarnings,
      thisMonthNetEarnings,
    };
  }
}
