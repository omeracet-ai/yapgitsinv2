import { OnModuleInit } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../users/user.entity';
import { AuthUser } from '../../common/types/auth.types';
export declare class AuthService implements OnModuleInit {
    private usersService;
    private jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    onModuleInit(): Promise<void>;
    validateUser(emailOrPhone: string, pass: string): Promise<AuthUser | null>;
    login(user: AuthUser): {
        access_token: string;
        user: AuthUser;
    };
    adminLogin(username: string, password: string): Promise<{
        access_token: string;
        user: {
            id: string;
            fullName: string;
            email: string;
            role: UserRole.ADMIN;
        };
    }>;
    register(userData: {
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
            latitude: number | null;
            longitude: number | null;
            lastLocationAt: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
}
