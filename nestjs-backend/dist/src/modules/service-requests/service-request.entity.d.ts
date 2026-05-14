import { User } from '../users/user.entity';
export declare class ServiceRequest {
    id: string;
    tenantId: string | null;
    userId: string;
    user: User;
    category: string;
    categoryId: string;
    title: string;
    description: string;
    location: string;
    address: string;
    imageUrl: string;
    latitude: number | null;
    longitude: number | null;
    geohash: string | null;
    price: number;
    priceMinor: number | null;
    status: string;
    featuredOrder: number | null;
    createdAt: Date;
    updatedAt: Date;
}
