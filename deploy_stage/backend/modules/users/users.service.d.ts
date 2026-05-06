import { Repository } from 'typeorm';
import { User } from './user.entity';
export type StatField = 'asCustomerTotal' | 'asCustomerSuccess' | 'asCustomerFail' | 'asWorkerTotal' | 'asWorkerSuccess' | 'asWorkerFail';
export declare class UsersService {
    private repo;
    constructor(repo: Repository<User>);
    findByEmail(email: string): Promise<User | null>;
    findByPhone(phoneNumber: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    findAll(): Promise<User[]>;
    findWorkers(category?: string, city?: string): Promise<User[]>;
    create(userData: Partial<User>): Promise<User>;
    update(id: string, data: Partial<User>): Promise<User | null>;
    deleteById(id: string): Promise<void>;
    bumpStat(userId: string, field: StatField): Promise<void>;
    recalcRating(userId: string, newRating: number): Promise<void>;
    updateLocation(id: string, latitude: number, longitude: number): Promise<void>;
    recalcReputation(userId: string): Promise<void>;
}
