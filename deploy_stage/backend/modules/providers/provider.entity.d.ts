import { User } from '../users/user.entity';
export declare class Provider {
    id: string;
    userId: string;
    user: User;
    businessName: string;
    bio: string;
    averageRating: number;
    totalReviews: number;
    isVerified: boolean;
    featuredOrder: number | null;
    documents: Record<string, string> | null;
    createdAt: Date;
    updatedAt: Date;
}
