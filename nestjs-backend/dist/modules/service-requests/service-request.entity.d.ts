import { User } from '../users/user.entity';
export declare class ServiceRequest {
    id: string;
    userId: string;
    user: User;
    category: string;
    categoryId: string;
    title: string;
    description: string;
    location: string;
    address: string;
    imageUrl: string;
    price: number;
    status: string;
    featuredOrder: number | null;
    createdAt: Date;
    updatedAt: Date;
}
