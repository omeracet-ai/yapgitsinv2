import { User } from './user.entity';
export declare class FavoriteWorker {
    id: string;
    tenantId: string | null;
    userId: string;
    workerId: string;
    worker: User;
    createdAt: Date;
}
