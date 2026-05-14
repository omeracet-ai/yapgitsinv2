import { User } from '../users/user.entity';
export declare class FavoriteProvider {
    id: string;
    tenantId: string | null;
    userId: string;
    user: User;
    providerId: string;
    provider: User;
    notes: string | null;
    createdAt: Date;
}
