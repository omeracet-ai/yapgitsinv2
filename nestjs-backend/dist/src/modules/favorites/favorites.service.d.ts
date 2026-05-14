import { Repository } from 'typeorm';
import { FavoriteProvider } from './favorite-provider.entity';
import { SavedJobSearch, SavedJobSearchCriteria } from './saved-job-search.entity';
import { User } from '../users/user.entity';
export declare class FavoritesService {
    private readonly favRepo;
    private readonly searchRepo;
    private readonly userRepo;
    constructor(favRepo: Repository<FavoriteProvider>, searchRepo: Repository<SavedJobSearch>, userRepo: Repository<User>);
    listFavoriteProviders(userId: string): Promise<Array<{
        id: string;
        providerId: string;
        notes: string | null;
        createdAt: Date;
        provider: {
            id: string;
            fullName: string;
            profileImageUrl: string | null;
            averageRating: number;
            totalReviews: number;
            identityVerified: boolean;
            workerCategories: string[] | null;
        } | null;
    }>>;
    addFavoriteProvider(userId: string, providerId: string, notes?: string | null): Promise<FavoriteProvider>;
    removeFavoriteProvider(userId: string, providerId: string): Promise<{
        removed: boolean;
    }>;
    listSavedSearches(userId: string): Promise<SavedJobSearch[]>;
    createSavedSearch(userId: string, name: string, criteria: SavedJobSearchCriteria, alertEnabled?: boolean): Promise<SavedJobSearch>;
    updateSavedSearch(userId: string, id: string, patch: {
        name?: string;
        criteria?: SavedJobSearchCriteria;
    }): Promise<SavedJobSearch>;
    deleteSavedSearch(userId: string, id: string): Promise<{
        deleted: boolean;
    }>;
}
