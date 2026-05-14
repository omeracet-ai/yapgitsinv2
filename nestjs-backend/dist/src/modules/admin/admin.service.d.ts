import { SuspendUserDto } from './dto/suspend-user.dto';
import { Repository, DataSource } from 'typeorm';
import { AdminListQueryDto, PaginatedResult } from './dto/admin-list-query.dto';
import { AdminAuditLog } from '../admin-audit/admin-audit-log.entity';
import { BulkVerifyDto } from './dto/bulk-verify.dto';
import { BulkFeatureDto, BulkUnfeatureDto } from './dto/bulk-feature.dto';
import { Job } from '../jobs/job.entity';
import { User } from '../users/user.entity';
import { Notification } from '../notifications/notification.entity';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { ServiceRequest } from '../service-requests/service-request.entity';
import { Offer } from '../jobs/offer.entity';
import { Booking } from '../bookings/booking.entity';
import { Review } from '../reviews/review.entity';
import { PaymentEscrow } from '../escrow/payment-escrow.entity';
import { ChatMessage } from '../chat/chat-message.entity';
import { JobQuestion } from '../jobs/job-question.entity';
import { Provider } from '../providers/provider.entity';
import { FcmService } from '../notifications/fcm.service';
import { PromoService, CreatePromoDto, UpdatePromoDto } from '../promo/promo.service';
export interface FlaggedItem {
    type: 'chat' | 'question';
    id: string;
    text: string;
    flagReason: string | null;
    userId: string;
    createdAt: Date;
}
export declare class AdminService {
    private jobsRepo;
    private usersRepo;
    private srRepo;
    private offersRepo;
    private bookingsRepo;
    private reviewsRepo;
    private escrowRepo;
    private chatRepo;
    private questionRepo;
    private notificationRepo;
    private auditRepo;
    private providersRepo;
    private readonly promoService;
    private readonly fcmService;
    private readonly dataSource;
    private readonly logger;
    constructor(jobsRepo: Repository<Job>, usersRepo: Repository<User>, srRepo: Repository<ServiceRequest>, offersRepo: Repository<Offer>, bookingsRepo: Repository<Booking>, reviewsRepo: Repository<Review>, escrowRepo: Repository<PaymentEscrow>, chatRepo: Repository<ChatMessage>, questionRepo: Repository<JobQuestion>, notificationRepo: Repository<Notification>, auditRepo: Repository<AdminAuditLog>, providersRepo: Repository<Provider>, promoService: PromoService, fcmService: FcmService, dataSource: DataSource);
    bulkVerifyUsers(dto: BulkVerifyDto, adminUserId: string): Promise<{
        updated: number;
        notFound: string[];
        requestedSegment: 'verify' | 'unverify';
    }>;
    bulkFeatureWorkers(dto: BulkFeatureDto, adminUserId: string): Promise<{
        updated: number;
        notFound: string[];
        featuredOrder: 1 | 2 | 3 | null;
    }>;
    bulkUnfeatureWorkers(dto: BulkUnfeatureDto, adminUserId: string): Promise<{
        updated: number;
        notFound: string[];
    }>;
    getBroadcastHistory(): Promise<{
        title: string;
        body: string;
        createdAt: Date;
        count: number;
    }[]>;
    broadcastNotification(dto: BroadcastNotificationDto): Promise<{
        sent: number;
        segment: string;
    }>;
    private broadcastFcmPush;
    getFlaggedItems(): Promise<FlaggedItem[]>;
    clearFlaggedChat(id: string): Promise<{
        id: string;
        type: string;
        cleared: boolean;
    }>;
    clearFlaggedQuestion(id: string): Promise<{
        id: string;
        type: string;
        cleared: boolean;
    }>;
    getModerationQueue(type: 'job' | 'review' | 'chat', page?: number, limit?: number): Promise<{
        data: unknown[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    moderateItem(type: 'job' | 'review' | 'chat', id: string, action: 'approve' | 'remove' | 'ban_user'): Promise<{
        id: string;
        type: string;
        action: string;
        ok: true;
    }>;
    listPromoCodes(): Promise<import("../promo/promo-code.entity").PromoCode[]>;
    createPromoCode(dto: CreatePromoDto): Promise<import("../promo/promo-code.entity").PromoCode>;
    updatePromoCode(id: string, dto: UpdatePromoDto): Promise<import("../promo/promo-code.entity").PromoCode>;
    deletePromoCode(id: string): Promise<{
        success: true;
    }>;
    getRevenue(): Promise<{
        totalGross: number;
        totalPlatformFee: number;
        totalTaskerNet: number;
        releasedCount: number;
        last30Days: {
            totalGross: number;
            totalPlatformFee: number;
            totalTaskerNet: number;
            releasedCount: number;
        };
    }>;
    getDashboardStats(): Promise<{
        totalJobs: number;
        openJobs: number;
        completedJobs: number;
        totalUsers: number;
        totalWorkers: number;
        verifiedWorkers: number;
        totalProviders: number;
        verifiedProviders: number;
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
    getJobsPaged(q: AdminListQueryDto): Promise<PaginatedResult<Job>>;
    getAllUsers(): Promise<User[]>;
    getUsersPaged(q: AdminListQueryDto): Promise<PaginatedResult<User>>;
    getAllServiceRequests(limit?: number): Promise<ServiceRequest[]>;
    setServiceRequestFeaturedOrder(id: string, featuredOrder: number | null): Promise<import("typeorm").UpdateResult>;
    setJobFeaturedOrder(id: string, featuredOrder: number | null): Promise<import("typeorm").UpdateResult>;
    verifyUser(id: string, identityVerified: boolean): Promise<import("typeorm").UpdateResult>;
    suspendUser(targetId: string, dto: SuspendUserDto, adminUserId: string): Promise<{
        id: string;
        suspended: boolean;
        suspendedReason: string | null;
        suspendedAt: Date | null;
        suspendedBy: string | null;
    }>;
    setUserBadges(id: string, badges: string[]): Promise<{
        id: string;
        badges: string[];
    }>;
    setUserSkills(id: string, skills: string[]): Promise<{
        id: string;
        workerSkills: string[];
    }>;
    private static readonly ADMIN_MANUAL_BADGE_KEYS;
    grantManualBadge(userId: string, badgeKey: string): Promise<{
        id: string;
        manualBadges: string[];
    }>;
    revokeManualBadge(userId: string, badgeKey: string): Promise<{
        id: string;
        manualBadges: string[];
    }>;
    getAnalyticsOverview(): Promise<{
        dailyRegistrations: any;
        dailyJobs: any;
        revenueByDay: any;
        topCategories: any;
        workersByCity: any;
    }>;
    setJobLocation(id: string, latitude: number, longitude: number): Promise<{
        id: string;
    }>;
    setUserLocation(id: string, latitude: number, longitude: number): Promise<{
        id: string;
    }>;
}
