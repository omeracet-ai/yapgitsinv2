import { Repository } from 'typeorm';
import { Job } from '../jobs/job.entity';
import { Offer } from '../jobs/offer.entity';
import { Booking } from '../bookings/booking.entity';
interface MonthlyPoint {
    month: string;
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
    platformFeePct: number;
    platformFeesPaid: number;
    netEarnings: number;
    thisMonthNetEarnings: number;
}
export declare class EarningsService {
    private jobsRepo;
    private offersRepo;
    private bookingsRepo;
    constructor(jobsRepo: Repository<Job>, offersRepo: Repository<Offer>, bookingsRepo: Repository<Booking>);
    private ym;
    getEarnings(userId: string, monthsRaw: number): Promise<EarningsPayload>;
}
export {};
