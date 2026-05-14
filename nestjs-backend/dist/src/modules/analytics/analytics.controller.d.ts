import { AnalyticsService } from './analytics.service';
import type { AnalyticsOverview, WorkerAnalytics, LeadAnalytics, RevenueAnalytics } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getOverview(): Promise<AnalyticsOverview>;
    getWorkers(workerId?: string): Promise<WorkerAnalytics[]>;
    getLeads(): Promise<LeadAnalytics>;
    getRevenue(): Promise<RevenueAnalytics>;
}
