import { OnModuleInit } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../users/user.entity';
export declare class AuthService implements OnModuleInit {
    private usersService;
    private jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    onModuleInit(): Promise<void>;
    validateUser(email: string, pass: string): Promise<any>;
    login(user: any): Promise<{
        access_token: string;
        user: any;
    }>;
    adminLogin(username: string, password: string): Promise<{
        access_token: string;
        user: {
            id: string;
            fullName: string;
            email: string;
            role: UserRole.ADMIN;
        };
    }>;
    register(userData: any): Promise<{
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
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
}
