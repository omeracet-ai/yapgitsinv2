export declare enum UserRole {
    USER = "user",
    ADMIN = "admin"
}
export declare class User {
    id: string;
    fullName: string;
    phoneNumber: string;
    email: string;
    passwordHash: string;
    profileImageUrl: string;
    identityPhotoUrl: string;
    documentPhotoUrl: string;
    identityVerified: boolean;
    birthDate: string;
    gender: string;
    city: string;
    district: string;
    address: string;
    isPhoneVerified: boolean;
    role: UserRole;
    tokenBalance: number;
    asCustomerTotal: number;
    asCustomerSuccess: number;
    asCustomerFail: number;
    asWorkerTotal: number;
    asWorkerSuccess: number;
    asWorkerFail: number;
    averageRating: number;
    totalReviews: number;
    reputationScore: number;
    workerCategories: string[] | null;
    workerBio: string | null;
    hourlyRateMin: number | null;
    hourlyRateMax: number | null;
    serviceRadiusKm: number;
    isAvailable: boolean;
    createdAt: Date;
    updatedAt: Date;
}
