import type { Cache } from 'cache-manager';
import type { Response } from 'express';
import { AddOfferTemplateDto } from './dto/add-offer-template.dto';
import { AddMessageTemplateDto } from './dto/add-message-template.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { DataPrivacyService } from './data-privacy.service';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { FavoriteWorkersService } from './favorite-workers.service';
import { EarningsService } from './earnings.service';
import { WorkerInsuranceService } from './worker-insurance.service';
import { WorkerCertificationService } from './worker-certification.service';
import { CalendarSyncService } from './calendar-sync.service';
import { AvailabilityService } from '../availability/availability.service';
import { Job } from '../jobs/job.entity';
import { Review } from '../reviews/review.entity';
import { Offer } from '../jobs/offer.entity';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
export declare class UsersController {
    private readonly svc;
    private readonly favWorkersSvc;
    private readonly earningsSvc;
    private readonly insuranceSvc;
    private readonly certificationSvc;
    private readonly calendarSyncSvc;
    private readonly availabilitySvc;
    private readonly adminAuditService;
    private readonly dataPrivacy;
    private jobsRepo;
    private reviewsRepo;
    private offersRepo;
    private readonly cache;
    constructor(svc: UsersService, favWorkersSvc: FavoriteWorkersService, earningsSvc: EarningsService, insuranceSvc: WorkerInsuranceService, certificationSvc: WorkerCertificationService, calendarSyncSvc: CalendarSyncService, availabilitySvc: AvailabilityService, adminAuditService: AdminAuditService, dataPrivacy: DataPrivacyService, jobsRepo: Repository<Job>, reviewsRepo: Repository<Review>, offersRepo: Repository<Offer>, cache: Cache);
    private static profileCacheKey;
    private static readonly PROFILE_CACHE_TTL;
    private invalidateProfileCache;
    listFavoriteWorkers(req: AuthenticatedRequest): Promise<{
        data: import("./favorite-workers.service").FavoriteWorkerPublic[];
        total: number;
    }>;
    addFavoriteWorker(req: AuthenticatedRequest, workerId: string): Promise<{
        favorited: true;
        workerId: string;
    }>;
    removeFavoriteWorker(req: AuthenticatedRequest, workerId: string): Promise<{
        favorited: false;
        workerId: string;
    }>;
    getMe(req: AuthenticatedRequest): Promise<{
        profileCompletion: {
            percent: number;
            missingFields: string[];
            totalFields: number;
            filledFields: number;
        };
        badges: {
            key: string;
            label: string;
            icon: string;
        }[];
        id: string;
        tenantId: string | null;
        fullName: string;
        phoneNumber: string;
        email: string;
        profileImageUrl: string;
        profileVideoUrl: string;
        identityPhotoUrl: string;
        documentPhotoUrl: string;
        identityVerified: boolean;
        birthDate: string;
        gender: string;
        city: string;
        district: string;
        address: string;
        isPhoneVerified: boolean;
        emailVerified: boolean;
        role: import("./user.entity").UserRole;
        tokenBalance: number;
        tokenBalanceMinor: number;
        preferredCurrency: string;
        asCustomerTotal: number;
        asCustomerSuccess: number;
        asCustomerFail: number;
        asWorkerTotal: number;
        asWorkerSuccess: number;
        asWorkerFail: number;
        averageRating: number;
        totalReviews: number;
        reputationScore: number;
        wilsonScore: number;
        workerCategories: string[] | null;
        workerBio: string | null;
        hourlyRateMin: number | null;
        hourlyRateMax: number | null;
        hourlyRateMinMinor: number | null;
        hourlyRateMaxMinor: number | null;
        serviceRadiusKm: number;
        isAvailable: boolean;
        availabilitySchedule: {
            mon: boolean;
            tue: boolean;
            wed: boolean;
            thu: boolean;
            fri: boolean;
            sat: boolean;
            sun: boolean;
        } | null;
        workerSkills: string[] | null;
        manualBadges: string[] | null;
        portfolioPhotos: string[] | null;
        portfolioVideos: string[] | null;
        introVideoUrl: string | null;
        introVideoDuration: number | null;
        responseTimeMinutes: number | null;
        latitude: number | null;
        longitude: number | null;
        lastLocationAt: string | null;
        homeGeohash: string | null;
        twoFactorEnabled: boolean;
        twoFactorSecret: string | null;
        suspended: boolean;
        suspendedReason: string | null;
        suspendedAt: Date | null;
        suspendedBy: string | null;
        deactivated: boolean;
        deactivatedAt: Date | null;
        notificationPreferences: {
            booking: boolean;
            offer: boolean;
            review: boolean;
            message: boolean;
            system: boolean;
        } | null;
        offerTemplates: string[] | null;
        customerMessageTemplates: string[] | null;
        lastSeenAt: Date | null;
        isOnline: boolean;
        fcmTokens: string[] | null;
        pushNotificationsEnabled: boolean;
        referralCode: string | null;
        referredByUserId: string | null;
        calendarToken: string | null;
        tokenVersion: number;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    getMyEarnings(req: AuthenticatedRequest, monthsRaw?: string): Promise<import("./earnings.service").EarningsPayload>;
    getMyCompletion(req: AuthenticatedRequest): Promise<{
        score: number;
        missing: Array<{
            field: string;
            label: string;
            points: number;
        }>;
        isWorker: boolean;
    }>;
    getNotificationPreferences(req: AuthenticatedRequest): Promise<{
        preferences: import("./user.entity").User["notificationPreferences"];
    }>;
    updateNotificationPreferences(req: AuthenticatedRequest, body: {
        preferences?: Partial<{
            booking: boolean;
            offer: boolean;
            review: boolean;
            message: boolean;
            system: boolean;
        }> | null;
    }): Promise<{
        preferences: import("./user.entity").User["notificationPreferences"];
    }>;
    getOfferTemplates(req: AuthenticatedRequest): Promise<{
        templates: string[];
    }>;
    addOfferTemplate(req: AuthenticatedRequest, body: AddOfferTemplateDto): Promise<{
        templates: string[];
    }>;
    removeOfferTemplate(req: AuthenticatedRequest, index: number): Promise<{
        templates: string[];
    }>;
    getMessageTemplates(req: AuthenticatedRequest): Promise<{
        templates: string[];
    }>;
    addMessageTemplate(req: AuthenticatedRequest, body: AddMessageTemplateDto): Promise<{
        templates: string[];
    }>;
    removeMessageTemplate(req: AuthenticatedRequest, index: number): Promise<{
        templates: string[];
    }>;
    updateAvailability(req: AuthenticatedRequest, body: {
        schedule?: Record<string, unknown> | null;
    }): Promise<{
        schedule: import("./user.entity").User["availabilitySchedule"];
    }>;
    updateLocation(req: AuthenticatedRequest, body: {
        latitude: number;
        longitude: number;
    }): Promise<{
        ok: boolean;
    }>;
    updateMe(req: AuthenticatedRequest, body: {
        fullName?: string;
        email?: string;
        phoneNumber?: string;
        birthDate?: string;
        gender?: string;
        city?: string;
        district?: string;
        address?: string;
        identityPhotoUrl?: string;
        documentPhotoUrl?: string;
        profileImageUrl?: string;
        profileVideoUrl?: string;
        workerCategories?: string[];
        workerSkills?: string[];
        workerBio?: string;
        hourlyRateMin?: number;
        hourlyRateMax?: number;
        serviceRadiusKm?: number;
        isAvailable?: boolean;
    }): Promise<{
        id: string;
        tenantId: string | null;
        fullName: string;
        phoneNumber: string;
        email: string;
        profileImageUrl: string;
        profileVideoUrl: string;
        identityPhotoUrl: string;
        documentPhotoUrl: string;
        identityVerified: boolean;
        birthDate: string;
        gender: string;
        city: string;
        district: string;
        address: string;
        isPhoneVerified: boolean;
        emailVerified: boolean;
        role: import("./user.entity").UserRole;
        tokenBalance: number;
        tokenBalanceMinor: number;
        preferredCurrency: string;
        asCustomerTotal: number;
        asCustomerSuccess: number;
        asCustomerFail: number;
        asWorkerTotal: number;
        asWorkerSuccess: number;
        asWorkerFail: number;
        averageRating: number;
        totalReviews: number;
        reputationScore: number;
        wilsonScore: number;
        workerCategories: string[] | null;
        workerBio: string | null;
        hourlyRateMin: number | null;
        hourlyRateMax: number | null;
        hourlyRateMinMinor: number | null;
        hourlyRateMaxMinor: number | null;
        serviceRadiusKm: number;
        isAvailable: boolean;
        availabilitySchedule: {
            mon: boolean;
            tue: boolean;
            wed: boolean;
            thu: boolean;
            fri: boolean;
            sat: boolean;
            sun: boolean;
        } | null;
        workerSkills: string[] | null;
        badges: string[] | null;
        manualBadges: string[] | null;
        portfolioPhotos: string[] | null;
        portfolioVideos: string[] | null;
        introVideoUrl: string | null;
        introVideoDuration: number | null;
        responseTimeMinutes: number | null;
        latitude: number | null;
        longitude: number | null;
        lastLocationAt: string | null;
        homeGeohash: string | null;
        twoFactorEnabled: boolean;
        twoFactorSecret: string | null;
        suspended: boolean;
        suspendedReason: string | null;
        suspendedAt: Date | null;
        suspendedBy: string | null;
        deactivated: boolean;
        deactivatedAt: Date | null;
        notificationPreferences: {
            booking: boolean;
            offer: boolean;
            review: boolean;
            message: boolean;
            system: boolean;
        } | null;
        offerTemplates: string[] | null;
        customerMessageTemplates: string[] | null;
        lastSeenAt: Date | null;
        isOnline: boolean;
        fcmTokens: string[] | null;
        pushNotificationsEnabled: boolean;
        referralCode: string | null;
        referredByUserId: string | null;
        calendarToken: string | null;
        tokenVersion: number;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    registerFcmToken(req: AuthenticatedRequest, body: {
        token?: string;
    }): Promise<{
        tokens: string[];
    }>;
    unregisterFcmToken(req: AuthenticatedRequest, body: {
        token?: string;
    }): Promise<{
        tokens: string[];
    }>;
    getMyInsurance(req: AuthenticatedRequest): Promise<import("./worker-insurance.entity").WorkerInsurance | null>;
    upsertMyInsurance(req: AuthenticatedRequest, body: {
        policyNumber: string;
        provider: string;
        coverageAmount: number;
        expiresAt: string;
        documentUrl?: string | null;
    }): Promise<import("./worker-insurance.entity").WorkerInsurance>;
    deleteMyInsurance(req: AuthenticatedRequest): Promise<{
        ok: true;
    }>;
    listMyCertifications(req: AuthenticatedRequest): Promise<import("./worker-certification.entity").WorkerCertification[]>;
    addMyCertification(req: AuthenticatedRequest, body: {
        name: string;
        issuer: string;
        issuedAt: string;
        expiresAt?: string | null;
        documentUrl?: string | null;
    }): Promise<import("./worker-certification.entity").WorkerCertification>;
    deleteMyCertification(req: AuthenticatedRequest, id: string): Promise<{
        ok: true;
    }>;
    getPublicCertifications(userId: string): Promise<{
        name: string;
        issuer: string;
        issuedAt: Date;
        expiresAt: Date | null;
        verified: boolean;
    }[]>;
    getPublicInsurance(id: string): Promise<{
        provider: string;
        coverageAmount: number;
        expiresAt: Date;
        verified: boolean;
    } | null>;
    exportMyData(req: AuthenticatedRequest, res: Response): Promise<void>;
    requestDataDeletion(req: AuthenticatedRequest, body: {
        reason?: string;
    }): Promise<import("./data-deletion-request.entity").DataDeletionRequest>;
    deleteMe(req: AuthenticatedRequest, body: DeleteAccountDto): Promise<{
        deactivated: true;
        deactivatedAt: string;
    }>;
    addPortfolioPhoto(req: AuthenticatedRequest, body: {
        url: string;
    }): Promise<{
        portfolioPhotos: string[];
    } | null>;
    removePortfolioPhoto(req: AuthenticatedRequest, body: {
        url: string;
    }): Promise<{
        portfolioPhotos: string[];
    } | null>;
    addPortfolioVideo(req: AuthenticatedRequest, body: {
        url: string;
    }): Promise<{
        videos: string[];
    } | null>;
    removePortfolioVideo(req: AuthenticatedRequest, body: {
        url: string;
    }): Promise<{
        videos: string[];
    } | null>;
    setIntroVideo(req: AuthenticatedRequest, body: {
        url: string;
        duration?: number | null;
    }): Promise<{
        introVideoUrl: string;
        introVideoDuration: number | null;
    }>;
    removeIntroVideo(req: AuthenticatedRequest): Promise<{
        introVideoUrl: null;
        introVideoDuration: null;
    }>;
    enableCalendar(req: AuthenticatedRequest): Promise<{
        calendarUrl: string;
        token: string;
    }>;
    regenerateCalendar(req: AuthenticatedRequest): Promise<{
        calendarUrl: string;
        token: string;
    }>;
    disableCalendar(req: AuthenticatedRequest): Promise<{
        ok: true;
    }>;
    getCalendarIcs(userId: string, token: string, res: Response): Promise<void>;
    getNearbyWorkers(lat?: string, lon?: string, radius?: string, category?: string, verifiedOnly?: string, page?: string, limit?: string): Promise<{
        data: {
            id: string;
            tenantId: string | null;
            fullName: string;
            phoneNumber: string;
            email: string;
            profileImageUrl: string;
            profileVideoUrl: string;
            identityPhotoUrl: string;
            documentPhotoUrl: string;
            identityVerified: boolean;
            birthDate: string;
            gender: string;
            city: string;
            district: string;
            address: string;
            isPhoneVerified: boolean;
            emailVerified: boolean;
            role: import("./user.entity").UserRole;
            tokenBalance: number;
            tokenBalanceMinor: number;
            preferredCurrency: string;
            asCustomerTotal: number;
            asCustomerSuccess: number;
            asCustomerFail: number;
            asWorkerTotal: number;
            asWorkerSuccess: number;
            asWorkerFail: number;
            averageRating: number;
            totalReviews: number;
            reputationScore: number;
            wilsonScore: number;
            workerCategories: string[] | null;
            workerBio: string | null;
            hourlyRateMin: number | null;
            hourlyRateMax: number | null;
            hourlyRateMinMinor: number | null;
            hourlyRateMaxMinor: number | null;
            serviceRadiusKm: number;
            isAvailable: boolean;
            availabilitySchedule: {
                mon: boolean;
                tue: boolean;
                wed: boolean;
                thu: boolean;
                fri: boolean;
                sat: boolean;
                sun: boolean;
            } | null;
            workerSkills: string[] | null;
            badges: string[] | null;
            manualBadges: string[] | null;
            portfolioPhotos: string[] | null;
            portfolioVideos: string[] | null;
            introVideoUrl: string | null;
            introVideoDuration: number | null;
            responseTimeMinutes: number | null;
            latitude: number | null;
            longitude: number | null;
            lastLocationAt: string | null;
            homeGeohash: string | null;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            suspended: boolean;
            suspendedReason: string | null;
            suspendedAt: Date | null;
            suspendedBy: string | null;
            deactivated: boolean;
            deactivatedAt: Date | null;
            notificationPreferences: {
                booking: boolean;
                offer: boolean;
                review: boolean;
                message: boolean;
                system: boolean;
            } | null;
            offerTemplates: string[] | null;
            customerMessageTemplates: string[] | null;
            lastSeenAt: Date | null;
            isOnline: boolean;
            fcmTokens: string[] | null;
            pushNotificationsEnabled: boolean;
            referralCode: string | null;
            referredByUserId: string | null;
            calendarToken: string | null;
            tokenVersion: number;
            createdAt: Date;
            updatedAt: Date;
            distanceKm: number;
        }[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    getWorkers(category?: string, city?: string, minRating?: string, minRate?: string, maxRate?: string, verifiedOnly?: string, availableOnly?: string, availableDay?: string, sortBy?: string, page?: string, limit?: string, lat?: string, lng?: string, radiusKm?: string, semanticQuery?: string): Promise<{
        data: {
            badges: {
                key: string;
                label: string;
                icon: string;
            }[];
            id: string;
            tenantId: string | null;
            fullName: string;
            phoneNumber: string;
            email: string;
            profileImageUrl: string;
            profileVideoUrl: string;
            identityPhotoUrl: string;
            documentPhotoUrl: string;
            identityVerified: boolean;
            birthDate: string;
            gender: string;
            city: string;
            district: string;
            address: string;
            isPhoneVerified: boolean;
            emailVerified: boolean;
            role: import("./user.entity").UserRole;
            tokenBalance: number;
            tokenBalanceMinor: number;
            preferredCurrency: string;
            asCustomerTotal: number;
            asCustomerSuccess: number;
            asCustomerFail: number;
            asWorkerTotal: number;
            asWorkerSuccess: number;
            asWorkerFail: number;
            averageRating: number;
            totalReviews: number;
            reputationScore: number;
            wilsonScore: number;
            workerCategories: string[] | null;
            workerBio: string | null;
            hourlyRateMin: number | null;
            hourlyRateMax: number | null;
            hourlyRateMinMinor: number | null;
            hourlyRateMaxMinor: number | null;
            serviceRadiusKm: number;
            isAvailable: boolean;
            availabilitySchedule: {
                mon: boolean;
                tue: boolean;
                wed: boolean;
                thu: boolean;
                fri: boolean;
                sat: boolean;
                sun: boolean;
            } | null;
            workerSkills: string[] | null;
            manualBadges: string[] | null;
            portfolioPhotos: string[] | null;
            portfolioVideos: string[] | null;
            introVideoUrl: string | null;
            introVideoDuration: number | null;
            responseTimeMinutes: number | null;
            latitude: number | null;
            longitude: number | null;
            lastLocationAt: string | null;
            homeGeohash: string | null;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            suspended: boolean;
            suspendedReason: string | null;
            suspendedAt: Date | null;
            suspendedBy: string | null;
            deactivated: boolean;
            deactivatedAt: Date | null;
            notificationPreferences: {
                booking: boolean;
                offer: boolean;
                review: boolean;
                message: boolean;
                system: boolean;
            } | null;
            offerTemplates: string[] | null;
            customerMessageTemplates: string[] | null;
            lastSeenAt: Date | null;
            isOnline: boolean;
            fcmTokens: string[] | null;
            pushNotificationsEnabled: boolean;
            referralCode: string | null;
            referredByUserId: string | null;
            calendarToken: string | null;
            tokenVersion: number;
            createdAt: Date;
            updatedAt: Date;
            distanceKm?: number;
        }[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    getAvailabilitySlots(id: string, daysRaw?: string): Promise<{
        date: string;
        dayOfWeek: string;
        weeklyAvailable: boolean;
        hasBooking: boolean;
        fullyBooked: boolean;
    }[]>;
    getMyAvailability(req: AuthenticatedRequest): Promise<import("../availability/availability-slot.entity").AvailabilitySlot[]>;
    bulkUpdateAvailability(req: AuthenticatedRequest, body: {
        days: Array<{
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            isAvailable: boolean;
        }>;
    }): Promise<import("../availability/availability-slot.entity").AvailabilitySlot[]>;
    getPublicAvailability(id: string): Promise<import("../availability/availability-slot.entity").AvailabilitySlot[]>;
    getCustomerProfile(id: string): Promise<{
        id: string;
        fullName: string;
        profileImageUrl: string;
        joinedAt: Date;
        identityVerified: boolean;
        asCustomerTotal: number;
        asCustomerSuccess: number;
        customerSuccessRate: number;
        completedJobsCount: number;
        monthlyActivity: {
            month: string;
            count: number;
        }[];
        topCategories: {
            category: string;
            count: number;
        }[];
        avgBudget: number;
        lastCompletedJobs: {
            id: string;
            title: string;
            category: string;
            completedAt: Date;
            budget: number;
        }[];
        reviewsReceivedAsCustomer: {
            id: string;
            rating: number;
            comment: string;
            reviewerName: string;
            createdAt: Date;
        }[];
    } | null>;
    getPublicProfile(id: string): Promise<{} | null>;
    private buildPublicProfile;
}
