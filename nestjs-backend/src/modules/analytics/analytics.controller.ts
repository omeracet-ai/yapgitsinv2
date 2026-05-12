import {
  Controller,
  Get,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import type {
  AnalyticsOverview,
  WorkerAnalytics,
  LeadAnalytics,
  RevenueAnalytics,
} from './analytics.service';

@Controller('analytics')
@UseGuards(AdminGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /analytics/overview
   * Returns overall marketplace analytics: leads, workers, bookings, revenue
   */
  @Get('overview')
  @HttpCode(HttpStatus.OK)
  async getOverview(): Promise<AnalyticsOverview> {
    return this.analyticsService.getOverview();
  }

  /**
   * GET /analytics/workers
   * Returns worker performance analytics
   * @param workerId - Optional: filter by specific worker
   */
  @Get('workers')
  @HttpCode(HttpStatus.OK)
  async getWorkers(
    @Query('workerId') workerId?: string,
  ): Promise<WorkerAnalytics[]> {
    return this.analyticsService.getWorkerAnalytics(workerId);
  }

  /**
   * GET /analytics/leads
   * Returns lead conversion and response metrics
   */
  @Get('leads')
  @HttpCode(HttpStatus.OK)
  async getLeads(): Promise<LeadAnalytics> {
    return this.analyticsService.getLeadAnalytics();
  }

  /**
   * GET /analytics/revenue
   * Returns revenue analytics by period and category
   */
  @Get('revenue')
  @HttpCode(HttpStatus.OK)
  async getRevenue(): Promise<RevenueAnalytics> {
    return this.analyticsService.getRevenueAnalytics();
  }
}
