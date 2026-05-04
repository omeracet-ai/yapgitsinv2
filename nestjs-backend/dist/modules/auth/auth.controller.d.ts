import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(body: {
        email: string;
        password: string;
    }): Promise<{
        access_token: string;
        user: any;
    }>;
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
    register(body: any): Promise<{
        access_token: string;
        user: {
            id: string;
            fullName: string;
            phoneNumber: string;
            email: string;
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
            role: import("../users/user.entity").UserRole;
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
        };
    }>;
}
