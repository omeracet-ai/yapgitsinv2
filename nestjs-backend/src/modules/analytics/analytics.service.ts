import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { User, UserRole } from '../users/user.entity';
import { Booking, BookingStatus } from '../bookings/booking.entity';
import { JobLead } from '../leads/job-lead.entity';
import { JobLeadResponse } from '../leads/job-lead-response.entity';

export interface AnalyticsOverview {
  totalLeads: number;
  activeLeads: number;
  totalWorkers: number;
  totalCustomers: number;
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  leadConversionRate: number;
}

export interface WorkerAnalytics {
  workerId: string;
  workerName: string;
  totalBookings: number;
  completedBookings: number;
  successRate: number;
  averageResponseTime: number; // in minutes
  totalEarnings: number;
  averageRating: number;
}

export interface LeadAnalytics {
  totalLeads: number;
  openLeads: number;
  inProgressLeads: number;
  closedLeads: number;
  expiredLeads: number;
  conversionRate: number; // leads with responses / total leads
  averageResponseCount: number;
  topCategories: Array<{ category: string; count: number }>;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  revenueByPeriod: Array<{
    period: string; // YYYY-MM
    revenue: number;
    bookingCount: number;
  }>;
  revenueByCategory: Array<{
    category: string;
    revenue: number;
  }>;
  averageTransactionValue: number;
}

@Injectable()
export class AnalyticsService {
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    @InjectRepository(JobLead)
    private jobLeadsRepository: Repository<JobLead>,
    @InjectRepository(JobLeadResponse)
    private jobLeadResponsesRepository: Repository<JobLeadResponse>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async getOverview(): Promise<AnalyticsOverview> {
    const cacheKey = 'analytics:overview';
    const cached = await this.cacheManager.get<AnalyticsOverview>(cacheKey);
    if (cached) return cached;

    const [
      totalLeads,
      activeLeads,
      totalWorkers,
      totalCustomers,
      totalBookings,
      completedBookings,
    ] = await Promise.all([
      this.jobLeadsRepository.count(),
      this.jobLeadsRepository.count({ where: { status: 'open' } }),
      this.usersRepository
        .createQueryBuilder('u')
        .where('u.role = :role', { role: 'user' })
        .andWhere('(u.asWorkerTotal > 0 OR u.asWorkerSuccess > 0)')
        .getCount(),
      this.usersRepository
        .createQueryBuilder('u')
        .where('u.role = :role', { role: 'user' })
        .andWhere('(u.asCustomerTotal > 0 OR u.asCustomerSuccess > 0)')
        .getCount(),
      this.bookingsRepository.count(),
      this.bookingsRepository.count({
        where: { status: BookingStatus.COMPLETED },
      }),
    ]);

    // Calculate revenue
    const bookings = await this.bookingsRepository.find({
      where: { status: BookingStatus.COMPLETED },
    });

    const totalRevenue = bookings.reduce((sum, b) => {
      const amount = (b.agreedPriceMinor ?? 0) / 100; // Convert minor units to currency
      return sum + amount;
    }, 0);

    const averageBookingValue =
      totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Lead conversion rate
    const leadsWithResponses = await this.jobLeadsRepository
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.responses', 'r')
      .getMany();

    const leadsWithResponsesCount = leadsWithResponses.filter(
      (l) => (l.responses?.length ?? 0) > 0,
    ).length;

    const leadConversionRate =
      totalLeads > 0 ? (leadsWithResponsesCount / totalLeads) * 100 : 0;

    const result: AnalyticsOverview = {
      totalLeads,
      activeLeads,
      totalWorkers,
      totalCustomers,
      totalBookings,
      completedBookings,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageBookingValue: Math.round(averageBookingValue * 100) / 100,
      leadConversionRate: Math.round(leadConversionRate * 100) / 100,
    };

    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  async getWorkerAnalytics(workerId?: string): Promise<WorkerAnalytics[]> {
    const cacheKey = workerId
      ? `analytics:workers:${workerId}`
      : 'analytics:workers:all';
    const cached = await this.cacheManager.get<WorkerAnalytics[]>(cacheKey);
    if (cached) return cached;

    let query = this.usersRepository
      .createQueryBuilder('u')
      .where('u.role = :role', { role: 'user' })
      .andWhere('u.asWorkerTotal > 0');

    if (workerId) {
      query = query.andWhere('u.id = :workerId', { workerId });
    }

    const workers = await query.getMany();

    const analytics: WorkerAnalytics[] = await Promise.all(
      workers.map(async (worker) => {
        const bookings = await this.bookingsRepository.find({
          where: { workerId: worker.id },
        });

        const completedBookings = bookings.filter(
          (b) => b.status === BookingStatus.COMPLETED,
        );

        const totalEarnings = completedBookings.reduce((sum, b) => {
          const amount = (b.agreedPriceMinor ?? 0) / 100;
          return sum + amount;
        }, 0);

        // Calculate average response time (in minutes from booking creation to confirmation)
        const confirmedBookings = bookings.filter(
          (b) => b.status !== BookingStatus.PENDING,
        );
        let avgResponseTime = 0;
        if (confirmedBookings.length > 0) {
          const totalTime = confirmedBookings.reduce((sum, b) => {
            const createdAt = new Date(b.createdAt).getTime();
            const updatedAt = new Date(b.updatedAt).getTime();
            return sum + (updatedAt - createdAt) / (1000 * 60);
          }, 0);
          avgResponseTime = totalTime / confirmedBookings.length;
        }

        return {
          workerId: worker.id,
          workerName: worker.fullName,
          totalBookings: bookings.length,
          completedBookings: completedBookings.length,
          successRate:
            bookings.length > 0
              ? (completedBookings.length / bookings.length) * 100
              : 0,
          averageResponseTime: Math.round(avgResponseTime * 100) / 100,
          totalEarnings: Math.round(totalEarnings * 100) / 100,
          averageRating: worker.averageRating || 0,
        };
      }),
    );

    // Sort by total bookings descending
    analytics.sort((a, b) => b.totalBookings - a.totalBookings);

    await this.cacheManager.set(cacheKey, analytics, this.CACHE_TTL);
    return analytics;
  }

  async getLeadAnalytics(): Promise<LeadAnalytics> {
    const cacheKey = 'analytics:leads';
    const cached = await this.cacheManager.get<LeadAnalytics>(cacheKey);
    if (cached) return cached;

    const [totalLeads, openLeads, inProgressLeads, closedLeads, expiredLeads] =
      await Promise.all([
        this.jobLeadsRepository.count(),
        this.jobLeadsRepository.count({ where: { status: 'open' } }),
        this.jobLeadsRepository.count({
          where: { status: 'in_progress' },
        }),
        this.jobLeadsRepository.count({ where: { status: 'closed' } }),
        this.jobLeadsRepository.count({ where: { status: 'expired' } }),
      ]);

    // Get all leads with responses
    const allLeads = await this.jobLeadsRepository
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.responses', 'responses')
      .getMany();

    const leadsWithResponses = allLeads.filter(
      (l) => (l.responses?.length ?? 0) > 0,
    ).length;

    const totalResponses = allLeads.reduce(
      (sum, l) => sum + (l.responses?.length ?? 0),
      0,
    );

    // Get top categories
    const categoryStats = allLeads.reduce(
      (acc, lead) => {
        const cat = lead.category || 'Unknown';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topCategories = Object.entries(categoryStats)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const result: LeadAnalytics = {
      totalLeads,
      openLeads,
      inProgressLeads,
      closedLeads,
      expiredLeads,
      conversionRate:
        totalLeads > 0 ? (leadsWithResponses / totalLeads) * 100 : 0,
      averageResponseCount:
        totalLeads > 0 ? totalResponses / totalLeads : 0,
      topCategories,
    };

    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  async getRevenueAnalytics(): Promise<RevenueAnalytics> {
    const cacheKey = 'analytics:revenue';
    const cached = await this.cacheManager.get<RevenueAnalytics>(cacheKey);
    if (cached) return cached;

    const completedBookings = await this.bookingsRepository.find({
      where: { status: BookingStatus.COMPLETED },
      order: { createdAt: 'DESC' },
    });

    // Calculate total revenue
    const totalRevenue = completedBookings.reduce((sum, b) => {
      const amount = (b.agreedPriceMinor ?? 0) / 100;
      return sum + amount;
    }, 0);

    // Group by period (YYYY-MM)
    const revenueByPeriodMap = new Map<
      string,
      { revenue: number; bookingCount: number }
    >();

    completedBookings.forEach((booking) => {
      const date = new Date(booking.createdAt);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const amount = (booking.agreedPriceMinor ?? 0) / 100;

      const current = revenueByPeriodMap.get(period) || {
        revenue: 0,
        bookingCount: 0,
      };
      current.revenue += amount;
      current.bookingCount += 1;
      revenueByPeriodMap.set(period, current);
    });

    const revenueByPeriod = Array.from(revenueByPeriodMap.entries())
      .map(([period, data]) => ({
        period,
        revenue: Math.round(data.revenue * 100) / 100,
        bookingCount: data.bookingCount,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // Group by category
    const revenueByCategory: Record<string, number> = {};
    completedBookings.forEach((booking) => {
      const cat = booking.category || 'Unknown';
      const amount = (booking.agreedPriceMinor ?? 0) / 100;
      revenueByCategory[cat] = (revenueByCategory[cat] || 0) + amount;
    });

    const revenueByCategoryArray = Object.entries(revenueByCategory)
      .map(([category, revenue]) => ({
        category,
        revenue: Math.round(revenue * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const result: RevenueAnalytics = {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      revenueByPeriod,
      revenueByCategory: revenueByCategoryArray,
      averageTransactionValue:
        completedBookings.length > 0
          ? Math.round((totalRevenue / completedBookings.length) * 100) / 100
          : 0,
    };

    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  async clearCache(): Promise<void> {
    const keys = [
      'analytics:overview',
      'analytics:workers:all',
      'analytics:leads',
      'analytics:revenue',
    ];

    for (const key of keys) {
      await this.cacheManager.del(key);
    }
  }
}
