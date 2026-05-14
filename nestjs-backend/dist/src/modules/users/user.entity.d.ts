export declare enum UserRole {
    USER = "user",
    ADMIN = "admin",
    SUPER_ADMIN = "super_admin"
}
export declare class User {
    id: string;
    tenantId: string | null;
    fullName: string;
    phoneNumber: string;
    email: string;
    passwordHash: string;
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
    role: UserRole;
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
}
