import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
export declare class AuthController {
    private authService;
    private twoFactorService;
    constructor(authService: AuthService, twoFactorService: TwoFactorService);
    login(body: {
        email: string;
        password: string;
    }): Promise<{
        requires2FA: boolean;
        tempToken: string;
        access_token?: undefined;
        refresh_token?: undefined;
        user?: undefined;
    } | {
        access_token: string;
        refresh_token: string;
        user: import("../../common/types/auth.types").AuthUser;
        requires2FA?: undefined;
        tempToken?: undefined;
    }>;
    refresh(body: {
        refreshToken: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(req: AuthenticatedRequest): Promise<void>;
    adminLogin(body: {
        username: string;
        password: string;
    }): Promise<{
        access_token: string;
        user: {
            id: string;
            fullName: string;
            email: string;
            role: import("../users/user.entity").UserRole.ADMIN;
        };
    }>;
    register(body: {
        email?: string;
        phoneNumber: string;
        password: string;
        fullName?: string;
        birthDate?: string;
        gender?: string;
        city?: string;
        district?: string;
        address?: string;
    }): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
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
            role: import("../users/user.entity").UserRole;
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
        };
    }>;
    setup2fa(req: AuthenticatedRequest): Promise<{
        secret: string;
        otpauthUrl: string;
        qrDataUrl: string;
    }>;
    enable2fa(req: AuthenticatedRequest, body: {
        code: string;
    }): Promise<{
        enabled: boolean;
    }>;
    disable2fa(req: AuthenticatedRequest, body: {
        code: string;
    }): Promise<{
        enabled: boolean;
    }>;
    loginVerify2fa(body: {
        tempToken: string;
        code: string;
    }): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
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
            role: import("../users/user.entity").UserRole;
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
        };
    }>;
    forgotPassword(body: {
        email: string;
    }): Promise<{
        success: true;
        message: string;
        resetUrl?: string;
    }>;
    resetPassword(body: {
        token: string;
        newPassword: string;
    }): Promise<{
        success: boolean;
    }>;
    requestEmailVerification(req: AuthenticatedRequest): Promise<{
        success: boolean;
        verifyUrl: string;
        message: string;
    }>;
    confirmEmailVerification(body: {
        token: string;
    }): Promise<{
        success: boolean;
        emailVerified: boolean;
    }>;
    requestSmsOtp(body: {
        phoneNumber: string;
    }): Promise<{
        success: boolean;
        expiresInSec: number;
    }>;
    verifySmsOtp(body: {
        phoneNumber: string;
        code: string;
    }): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
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
            role: import("../users/user.entity").UserRole;
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
        };
        isNewUser: boolean;
        phoneVerified?: undefined;
        phoneNumber?: undefined;
        message?: undefined;
    } | {
        access_token: null;
        user: null;
        isNewUser: boolean;
        phoneVerified: boolean;
        phoneNumber: string;
        message: string;
        refresh_token?: undefined;
    }>;
}
