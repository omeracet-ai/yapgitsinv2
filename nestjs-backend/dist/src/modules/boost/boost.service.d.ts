import { DataSource, Repository } from 'typeorm';
import { Boost, BoostType } from './boost.entity';
export declare class BoostService {
    private readonly boostRepo;
    private readonly dataSource;
    constructor(boostRepo: Repository<Boost>, dataSource: DataSource);
    getPackages(): {
        type: BoostType;
        tokenCost: number;
        durationHours: number;
        name: string;
        description: string;
    }[];
    purchase(userId: string, type: BoostType): Promise<{
        boost: Boost;
        newTokenBalance: number;
    }>;
    getMy(userId: string): Promise<{
        active: Boost[];
        history: Boost[];
    }>;
    expireExpired(): Promise<number>;
    getActiveBoostsForRanking(): Promise<Map<string, Set<BoostType>>>;
}
