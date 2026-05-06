import { Repository } from 'typeorm';
import { Job } from '../jobs/job.entity';
import { User } from '../users/user.entity';
import { ServiceRequest } from '../service-requests/service-request.entity';
import { Offer } from '../jobs/offer.entity';
import { Booking } from '../bookings/booking.entity';
import { Review } from '../reviews/review.entity';
export declare class AdminService {
    private jobsRepo;
    private usersRepo;
    private srRepo;
    private offersRepo;
    private bookingsRepo;
    private reviewsRepo;
    constructor(jobsRepo: Repository<Job>, usersRepo: Repository<User>, srRepo: Repository<ServiceRequest>, offersRepo: Repository<Offer>, bookingsRepo: Repository<Booking>, reviewsRepo: Repository<Review>);
    getDashboardStats(): Promise<{
        totalJobs: number;
        openJobs: number;
        completedJobs: number;
        totalUsers: number;
        totalWorkers: number;
        verifiedWorkers: number;
        totalServiceRequests: number;
        openServiceRequests: number;
        totalOffers: number;
        totalBookings: number;
        totalReviews: number;
        chartData: {
            jobsPerDay: {
                date: string;
                count: number;
            }[];
            usersPerDay: {
                date: string;
                count: number;
            }[];
        };
    }>;
    getChartData(): Promise<{
        jobsPerDay: {
            date: string;
            count: number;
        }[];
        usersPerDay: {
            date: string;
            count: number;
        }[];
    }>;
    getRecentJobs(limit?: number): Promise<Job[]>;
    getAllUsers(): Promise<User[]>;
    getAllServiceRequests(limit?: number): Promise<ServiceRequest[]>;
    setServiceRequestFeaturedOrder(id: string, featuredOrder: number | null): Promise<import("typeorm").UpdateResult>;
    setJobFeaturedOrder(id: string, featuredOrder: number | null): Promise<import("typeorm").UpdateResult>;
    verifyUser(id: string, identityVerified: boolean): Promise<import("typeorm").UpdateResult>;
}
