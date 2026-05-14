import type { Response } from 'express';
import { AdminService } from './admin.service';
import { CategoriesService } from '../categories/categories.service';
import { ProvidersService } from '../providers/providers.service';
import { Category } from '../categories/category.entity';
import { UserBlocksService } from '../user-blocks/user-blocks.service';
import type { UserReportStatus } from '../user-blocks/user-report.entity';
import { UpdateReportStatusDto } from '../user-blocks/dto/report-user.dto';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { AdminListQueryDto } from './dto/admin-list-query.dto';
import { BulkVerifyDto } from './dto/bulk-verify.dto';
import { BulkFeatureDto, BulkUnfeatureDto } from './dto/bulk-feature.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { PurgeAuditLogDto } from './dto/purge-audit-log.dto';
import { WorkerInsuranceService } from '../users/worker-insurance.service';
import { WorkerCertificationService } from '../users/worker-certification.service';
import { DataPrivacyService } from '../users/data-privacy.service';
import type { Request } from 'express';
import type { AuthUser } from '../../common/types/auth.types';
export declare class AdminController {
    private readonly adminService;
    private readonly categoriesService;
    private readonly providersService;
    private readonly userBlocksService;
    private readonly adminAuditService;
    private readonly systemSettings;
    private readonly insuranceSvc;
    private readonly certificationSvc;
    private readonly dataPrivacy;
    constructor(adminService: AdminService, categoriesService: CategoriesService, providersService: ProvidersService, userBlocksService: UserBlocksService, adminAuditService: AdminAuditService, systemSettings: SystemSettingsService, insuranceSvc: WorkerInsuranceService, certificationSvc: WorkerCertificationService, dataPrivacy: DataPrivacyService);
    listPendingCertifications(): Promise<import("../users/worker-certification.entity").WorkerCertification[]>;
    verifyCertification(id: string, body: {
        adminNote?: string;
    }, req: Request & {
        user: AuthUser;
    }): Promise<import("../users/worker-certification.entity").WorkerCertification>;
    rejectCertification(id: string, body: {
        adminNote?: string;
    }, req: Request & {
        user: AuthUser;
    }): Promise<import("../users/worker-certification.entity").WorkerCertification>;
    listDataDeletionRequests(status?: string): Promise<import("../users/data-deletion-request.entity").DataDeletionRequest[]>;
    moderateDataDeletionRequest(id: string, body: {
        action: 'approve' | 'reject';
        adminNote?: string;
    }, req: Request & {
        user: AuthUser;
    }): Promise<import("../users/data-deletion-request.entity").DataDeletionRequest>;
    executeDataDeletion(id: string, req: Request & {
        user: AuthUser;
    }): Promise<{
        deleted: true;
        userId: string;
    }>;
    verifyInsurance(id: string, body: {
        verified: boolean;
    }, req: Request & {
        user: AuthUser;
    }): Promise<import("../users/worker-insurance.entity").WorkerInsurance>;
    listSettings(): Promise<import("../system-settings/system-setting.entity").SystemSetting[]>;
    getSetting(key: string): Promise<{
        key: string;
        value: string;
    }>;
    updateSetting(key: string, body: {
        value: string;
    }, req: Request & {
        user: AuthUser;
    }): Promise<import("../system-settings/system-setting.entity").SystemSetting>;
    getAuditLog(limit?: string, offset?: string, action?: string, targetType?: string, adminUserId?: string): Promise<{
        data: import("../admin-audit/admin-audit-log.entity").AdminAuditLog[];
        total: number;
        limit: number;
        offset: number;
    }>;
    exportAuditLog(res: Response, action?: string, targetType?: string, adminUserId?: string): Promise<void>;
    getAuditLogStats(days?: string): Promise<import("../admin-audit/admin-audit.service").AuditLogStats>;
    getAuditLogPurgePreview(olderThanDays?: string): Promise<{
        wouldDelete: number;
        cutoffDate: string;
        olderThanDays: number;
    }>;
    purgeAuditLog(body: PurgeAuditLogDto, req: Request & {
        user: AuthUser;
    }): Promise<{
        deleted: number;
        cutoffDate: string;
        olderThanDays: number;
    }>;
    getAuditLogEntry(id: string): Promise<import("../admin-audit/admin-audit-log.entity").AdminAuditLog>;
    getStats(): Promise<{
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
    getRecentJobs(query: AdminListQueryDto): Promise<import("../jobs/job.entity").Job[]> | Promise<import("./dto/admin-list-query.dto").PaginatedResult<import("../jobs/job.entity").Job>>;
    setJobFeatured(id: string, body: {
        featuredOrder: number | null;
    }, req: Request & {
        user: AuthUser;
    }): Promise<import("typeorm").UpdateResult>;
    getUsers(query: AdminListQueryDto): Promise<import("../users/user.entity").User[]> | Promise<import("./dto/admin-list-query.dto").PaginatedResult<import("../users/user.entity").User>>;
    bulkVerifyUsers(dto: BulkVerifyDto, req: Request & {
        user: AuthUser;
    }): Promise<{
        updated: number;
        notFound: string[];
        requestedSegment: "verify" | "unverify";
    }>;
    bulkFeatureUsers(dto: BulkFeatureDto, req: Request & {
        user: AuthUser;
    }): Promise<{
        updated: number;
        notFound: string[];
        featuredOrder: 1 | 2 | 3 | null;
    }>;
    bulkUnfeatureUsers(dto: BulkUnfeatureDto, req: Request & {
        user: AuthUser;
    }): Promise<{
        updated: number;
        notFound: string[];
    }>;
    suspendUser(id: string, dto: SuspendUserDto, req: Request & {
        user: AuthUser;
    }): Promise<{
        id: string;
        suspended: boolean;
        suspendedReason: string | null;
        suspendedAt: Date | null;
        suspendedBy: string | null;
    }>;
    verifyUser(id: string, body: {
        identityVerified: boolean;
    }, req: Request & {
        user: AuthUser;
    }): Promise<import("typeorm").UpdateResult>;
    getServiceRequests(limit?: string): Promise<import("../service-requests/service-request.entity").ServiceRequest[]>;
    setServiceRequestFeatured(id: string, body: {
        featuredOrder: number | null;
    }, req: Request & {
        user: AuthUser;
    }): Promise<import("typeorm").UpdateResult>;
    getCategories(): Promise<Category[]>;
    updateCategory(id: string, body: Partial<Category>, req: Request & {
        user: AuthUser;
    }): Promise<Category>;
    getProviders(query: AdminListQueryDto): Promise<{
        id: string;
        userId: string;
        businessName: string;
        bio: string | null;
        isVerified: boolean;
        featuredOrder: number | null;
        documents: Record<string, string> | null;
        createdAt: Date;
        updatedAt: Date;
        averageRating: number;
        totalReviews: number;
        identityVerified: boolean;
        reputationScore: number;
        workerCategories: string[];
        workerSkills: string[];
        asWorkerSuccess: number;
        asWorkerTotal: number;
        badges: import("../users/badges.util").BadgeId[];
        user: {
            id: string;
            fullName: string;
            email: string;
            phoneNumber: string;
            profileImageUrl: string;
            city: string;
        };
    }[]> | Promise<import("./dto/admin-list-query.dto").PaginatedResult<{
        id: string;
        userId: string;
        businessName: string;
        bio: string | null;
        isVerified: boolean;
        featuredOrder: number | null;
        documents: Record<string, string> | null;
        createdAt: Date;
        updatedAt: Date;
        averageRating: number;
        totalReviews: number;
        identityVerified: boolean;
        reputationScore: number;
        workerCategories: string[];
        workerSkills: string[];
        asWorkerSuccess: number;
        asWorkerTotal: number;
        badges: import("../users/badges.util").BadgeId[];
        user: {
            id: string;
            fullName: string;
            email: string;
            phoneNumber: string;
            profileImageUrl: string;
            city: string;
        };
    }>>;
    verifyProvider(id: string, body: {
        isVerified: boolean;
    }, req: Request & {
        user: AuthUser;
    }): Promise<import("../providers/provider.entity").Provider>;
    setProviderFeatured(id: string, body: {
        featuredOrder: number | null;
    }, req: Request & {
        user: AuthUser;
    }): Promise<import("../providers/provider.entity").Provider>;
    setUserBadges(id: string, body: {
        badges: string[];
    }, req: Request & {
        user: AuthUser;
    }): Promise<{
        id: string;
        badges: string[];
    }>;
    grantManualBadge(id: string, body: {
        badgeKey: string;
    }): Promise<{
        id: string;
        manualBadges: string[];
    }>;
    revokeManualBadge(id: string, body: {
        badgeKey: string;
    }): Promise<{
        id: string;
        manualBadges: string[];
    }>;
    setUserSkills(id: string, body: {
        skills: string[];
    }, req: Request & {
        user: AuthUser;
    }): Promise<{
        id: string;
        workerSkills: string[];
    }>;
    listPromoCodes(): Promise<import("../promo/promo-code.entity").PromoCode[]>;
    createPromoCode(dto: Parameters<AdminService['createPromoCode']>[0], req: Request & {
        user: AuthUser;
    }): Promise<import("../promo/promo-code.entity").PromoCode>;
    updatePromoCode(id: string, dto: Parameters<AdminService['updatePromoCode']>[1], req: Request & {
        user: AuthUser;
    }): Promise<import("../promo/promo-code.entity").PromoCode>;
    deletePromoCode(id: string, req: Request & {
        user: AuthUser;
    }): Promise<{
        success: true;
    }>;
    getFlaggedItems(): Promise<import("./admin.service").FlaggedItem[]>;
    getModerationQueue(type?: 'job' | 'review' | 'chat', page?: string, limit?: string): Promise<{
        data: unknown[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    moderateItem(type: 'job' | 'review' | 'chat', id: string, body: {
        action: 'approve' | 'remove' | 'ban_user';
    }, req: Request & {
        user: AuthUser;
    }): Promise<{
        id: string;
        type: string;
        action: string;
        ok: true;
    }>;
    clearFlaggedChat(id: string, req: Request & {
        user: AuthUser;
    }): Promise<{
        id: string;
        type: string;
        cleared: boolean;
    }>;
    clearFlaggedQuestion(id: string, req: Request & {
        user: AuthUser;
    }): Promise<{
        id: string;
        type: string;
        cleared: boolean;
    }>;
    broadcastHistory(): Promise<{
        title: string;
        body: string;
        createdAt: Date;
        count: number;
    }[]>;
    broadcastNotification(dto: BroadcastNotificationDto, req: Request & {
        user: AuthUser;
    }): Promise<{
        sent: number;
        segment: string;
    }>;
    getReports(status?: UserReportStatus, page?: string, limit?: string): Promise<{
        data: import("../user-blocks/user-report.entity").UserReport[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    updateReportStatus(id: string, body: UpdateReportStatusDto, req: Request & {
        user: AuthUser;
    }): Promise<import("../user-blocks/user-report.entity").UserReport>;
    updateReport(id: string, body: {
        status: UserReportStatus;
        adminNote?: string;
    }, req: Request & {
        user: AuthUser;
    }): Promise<import("../user-blocks/user-report.entity").UserReport>;
    getAnalyticsOverview(): Promise<{
        dailyRegistrations: any;
        dailyJobs: any;
        revenueByDay: any;
        topCategories: any;
        workersByCity: any;
    }>;
}
