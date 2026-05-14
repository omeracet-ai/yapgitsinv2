import { Repository } from "typeorm";
import { Provider } from './provider.entity';
import { User } from '../users/user.entity';
import { AdminListQueryDto, PaginatedResult } from '../admin/dto/admin-list-query.dto';
export declare class ProvidersService {
    private repo;
    private usersRepo;
    constructor(repo: Repository<Provider>, usersRepo: Repository<User>);
    findAll(): Promise<{
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
    }[]>;
    findAllPaged(q: AdminListQueryDto): Promise<PaginatedResult<Awaited<ReturnType<ProvidersService['findAll']>>[number]>>;
    private calcBayesianRating;
    private getOrCreateForUser;
    setVerified(id: string, isVerified: boolean): Promise<Provider>;
    setFeaturedOrder(id: string, featuredOrder: number | null): Promise<Provider>;
}
