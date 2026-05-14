import { StatsService, PublicStats } from './stats.service';
export declare class StatsController {
    private readonly statsService;
    private readonly logger;
    constructor(statsService: StatsService);
    getPublic(): Promise<PublicStats>;
}
