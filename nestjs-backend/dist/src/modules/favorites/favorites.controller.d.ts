import { FavoritesService } from './favorites.service';
import type { SavedJobSearchCriteria } from './saved-job-search.entity';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
export declare class FavoritesController {
    private readonly svc;
    constructor(svc: FavoritesService);
    listFavoriteProviders(req: AuthenticatedRequest): Promise<{
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
    }[]>;
    addFavoriteProvider(req: AuthenticatedRequest, body: {
        providerId: string;
        notes?: string | null;
    }): Promise<import("./favorite-provider.entity").FavoriteProvider>;
    removeFavoriteProvider(req: AuthenticatedRequest, providerId: string): Promise<{
        removed: boolean;
    }>;
    listSavedSearches(req: AuthenticatedRequest): Promise<import("./saved-job-search.entity").SavedJobSearch[]>;
    createSavedSearch(req: AuthenticatedRequest, body: {
        name: string;
        criteria: SavedJobSearchCriteria;
    }): Promise<import("./saved-job-search.entity").SavedJobSearch>;
    updateSavedSearch(req: AuthenticatedRequest, id: string, body: {
        name?: string;
        criteria?: SavedJobSearchCriteria;
        alertEnabled?: boolean;
    }): Promise<import("./saved-job-search.entity").SavedJobSearch>;
    deleteSavedSearch(req: AuthenticatedRequest, id: string): Promise<{
        deleted: boolean;
    }>;
    listSavedSearchesAlias(req: AuthenticatedRequest): Promise<import("./saved-job-search.entity").SavedJobSearch[]>;
    createSavedSearchAlias(req: AuthenticatedRequest, body: {
        name: string;
        criteria: SavedJobSearchCriteria;
        alertEnabled?: boolean;
    }): Promise<import("./saved-job-search.entity").SavedJobSearch>;
    updateSavedSearchAlias(req: AuthenticatedRequest, id: string, body: {
        name?: string;
        criteria?: SavedJobSearchCriteria;
        alertEnabled?: boolean;
    }): Promise<import("./saved-job-search.entity").SavedJobSearch>;
    deleteSavedSearchAlias(req: AuthenticatedRequest, id: string): Promise<{
        deleted: boolean;
    }>;
}
