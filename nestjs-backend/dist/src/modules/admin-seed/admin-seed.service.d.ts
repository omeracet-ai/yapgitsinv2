import { DataSource } from 'typeorm';
export interface WipeCounts {
    reviews: number;
    payments: number;
    escrows: number;
    bookings: number;
    jobLeadResponses: number;
    jobLeads: number;
    users: number;
}
export interface CreateCounts {
    users: number;
    workers: number;
    customers: number;
    jobs: number;
    jobResponses: number;
    bookings: number;
    escrows: number;
    payments: number;
    reviews: number;
}
export declare class AdminSeedService {
    private readonly dataSource;
    private readonly logger;
    private readonly trFaker;
    constructor(dataSource: DataSource);
    wipeAll(): Promise<WipeCounts>;
    populate(count: number): Promise<CreateCounts>;
    wipeAndPopulate(count: number): Promise<{
        wiped: WipeCounts;
        created: CreateCounts;
    }>;
}
