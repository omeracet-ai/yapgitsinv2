import { Repository } from 'typeorm';
import { FavoriteWorker } from './favorite-worker.entity';
import { User } from './user.entity';
export interface FavoriteWorkerPublic {
    id: string;
    fullName: string;
    profileImageUrl: string | null;
    workerCategories: string[] | null;
    city: string | null;
    district: string | null;
    averageRating: number;
    totalReviews: number;
    reputationScore: number;
    identityVerified: boolean;
    hourlyRateMin: number | null;
    hourlyRateMax: number | null;
    isAvailable: boolean;
    favoritedAt: Date;
}
export declare class FavoriteWorkersService {
    private readonly favRepo;
    private readonly userRepo;
    constructor(favRepo: Repository<FavoriteWorker>, userRepo: Repository<User>);
    addFavorite(userId: string, workerId: string): Promise<{
        favorited: true;
        workerId: string;
    }>;
    removeFavorite(userId: string, workerId: string): Promise<{
        favorited: false;
        workerId: string;
    }>;
    listFavorites(userId: string): Promise<{
        data: FavoriteWorkerPublic[];
        total: number;
    }>;
}
