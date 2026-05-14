import { AdminSeedService } from './admin-seed.service';
export declare class AdminSeedController {
    private readonly seed;
    constructor(seed: AdminSeedService);
    private assertEnabled;
    private clampCount;
    private warning;
    wipe(): Promise<{
        wiped: import("./admin-seed.service").WipeCounts;
        durationMs: number;
        warning: string;
    }>;
    populate(count: number): Promise<{
        created: import("./admin-seed.service").CreateCounts;
        durationMs: number;
        warning: string;
    }>;
    wipeAndPopulate(count: number): Promise<{
        durationMs: number;
        warning: string;
        wiped: import("./admin-seed.service").WipeCounts;
        created: import("./admin-seed.service").CreateCounts;
    }>;
}
