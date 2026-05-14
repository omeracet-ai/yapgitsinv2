import { Repository } from 'typeorm';
import type { Cache } from 'cache-manager';
import { User } from '../users/user.entity';
import { Booking } from '../bookings/booking.entity';
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
    averageResponseTime: number;
    totalEarnings: number;
    averageRating: number;
}
export interface LeadAnalytics {
    totalLeads: number;
    openLeads: number;
    inProgressLeads: number;
    closedLeads: number;
    expiredLeads: number;
    conversionRate: number;
    averageResponseCount: number;
    topCategories: Array<{
        category: string;
        count: number;
    }>;
}
export interface RevenueAnalytics {
    totalRevenue: number;
    revenueByPeriod: Array<{
        period: string;
        revenue: number;
        bookingCount: number;
    }>;
    revenueByCategory: Array<{
        category: string;
        revenue: number;
    }>;
    averageTransactionValue: number;
}
export declare class AnalyticsService {
    private usersRepository;
    private bookingsRepository;
    private jobLeadsRepository;
    private jobLeadResponsesRepository;
    private cacheManager;
    private readonly CACHE_TTL;
    constructor(usersRepository: Repository<User>, bookingsRepository: Repository<Booking>, jobLeadsRepository: Repository<JobLead>, jobLeadResponsesRepository: Repository<JobLeadResponse>, cacheManager: Cache);
    getOverview(): Promise<AnalyticsOverview>;
    getWorkerAnalytics(workerId?: string): Promise<WorkerAnalytics[]>;
    getLeadAnalytics(): Promise<LeadAnalytics>;
    getRevenueAnalytics(): Promise<RevenueAnalytics>;
    clearCache(): Promise<void>;
}
