import { ConfigService } from '@nestjs/config';
interface WorkerLite {
    id: string;
    fullName?: string;
    workerBio?: string | null;
    workerCategories?: string[] | null;
    city?: string | null;
    averageRating?: number;
    hourlyRateMin?: number | null;
    hourlyRateMax?: number | null;
}
export declare class SemanticSearchService {
    private readonly configService;
    private readonly logger;
    private readonly client;
    private readonly cache;
    constructor(configService: ConfigService);
    isEnabled(): boolean;
    private cacheKey;
    rerankWorkers<T extends WorkerLite>(query: string, workers: T[]): Promise<T[]>;
}
export {};
