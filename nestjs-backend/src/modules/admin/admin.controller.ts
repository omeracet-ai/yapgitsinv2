import { Controller, Get, Patch, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { CategoriesService } from '../categories/categories.service';
import { ProvidersService } from '../providers/providers.service';
import { Category } from '../categories/category.entity';
import { UserBlocksService } from '../user-blocks/user-blocks.service';
import type { UserReportStatus } from '../user-blocks/user-report.entity';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import type { Request } from 'express';
import type { AuthUser } from '../../common/types/auth.types';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly categoriesService: CategoriesService,
    private readonly providersService: ProvidersService,
    private readonly userBlocksService: UserBlocksService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  @Get('audit-log')
  async getAuditLog(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminAuditService.findRecent(
      limit ? Number(limit) : 100,
      offset ? Number(offset) : 0,
    );
  }

  @Get('stats')
  getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('revenue')
  getRevenue() {
    return this.adminService.getRevenue();
  }

  @Get('jobs')
  getRecentJobs(@Query('limit') limit?: string) {
    return this.adminService.getRecentJobs(limit ? Number(limit) : 20);
  }

  @Patch('jobs/:id/featured')
  async setJobFeatured(
    @Param('id') id: string,
    @Body() body: { featuredOrder: number | null },
    @Req() req: Request & { user: AuthUser },
  ) {
    const result = await this.adminService.setJobFeaturedOrder(
      id,
      body.featuredOrder ?? null,
    );
    await this.adminAuditService.logAction(req.user.id, 'job.featured', 'job', id, body as unknown as Record<string, unknown>);
    return result;
  }

  @Get('users')
  getUsers() {
    return this.adminService.getAllUsers();
  }

  @Patch('users/:id/verify')
  async verifyUser(
    @Param('id') id: string,
    @Body() body: { identityVerified: boolean },
    @Req() req: Request & { user: AuthUser },
  ) {
    const result = await this.adminService.verifyUser(id, body.identityVerified);
    await this.adminAuditService.logAction(req.user.id, 'user.verify', 'user', id, body as unknown as Record<string, unknown>);
    return result;
  }

  @Get('service-requests')
  getServiceRequests(@Query('limit') limit?: string) {
    return this.adminService.getAllServiceRequests(limit ? Number(limit) : 50);
  }

  @Patch('service-requests/:id/featured')
  async setServiceRequestFeatured(
    @Param('id') id: string,
    @Body() body: { featuredOrder: number | null },
    @Req() req: Request & { user: AuthUser },
  ) {
    const result = await this.adminService.setServiceRequestFeaturedOrder(
      id,
      body.featuredOrder ?? null,
    );
    await this.adminAuditService.logAction(req.user.id, 'service_request.featured', 'service_request', id, body as unknown as Record<string, unknown>);
    return result;
  }

  @Get('categories')
  getCategories() {
    // Admin pasif kategorileri de görsün — pasif sadece public listede gizlensin
    return this.categoriesService.findAllIncludingInactive();
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: Partial<Category>) {
    return this.categoriesService.update(id, body);
  }

  @Get('providers')
  getProviders() {
    return this.providersService.findAll();
  }

  @Patch('providers/:id/verify')
  verifyProvider(
    @Param('id') id: string,
    @Body() body: { isVerified: boolean },
  ) {
    return this.providersService.setVerified(id, body.isVerified);
  }

  @Patch('providers/:id/featured')
  async setProviderFeatured(
    @Param('id') id: string,
    @Body() body: { featuredOrder: number | null },
    @Req() req: Request & { user: AuthUser },
  ) {
    const result = await this.providersService.setFeaturedOrder(id, body.featuredOrder ?? null);
    await this.adminAuditService.logAction(req.user.id, 'provider.featured', 'provider', id, body as unknown as Record<string, unknown>);
    return result;
  }

  /** Set Airtasker-style manual badges on a tasker (user-level). */
  @Patch('users/:id/badges')
  setUserBadges(
    @Param('id') id: string,
    @Body() body: { badges: string[] },
  ) {
    return this.adminService.setUserBadges(id, body.badges);
  }

  /** Set tasker skills (granular tags beyond workerCategories). */
  @Patch('users/:id/skills')
  setUserSkills(
    @Param('id') id: string,
    @Body() body: { skills: string[] },
  ) {
    return this.adminService.setUserSkills(id, body.skills);
  }

  // ── Promo Codes ────────────────────────────────────────────────────────────
  @Get('promo-codes')
  listPromoCodes() {
    return this.adminService.listPromoCodes();
  }

  @Post('promo-codes')
  createPromoCode(@Body() dto: Parameters<AdminService['createPromoCode']>[0]) {
    return this.adminService.createPromoCode(dto);
  }

  @Patch('promo-codes/:id')
  updatePromoCode(
    @Param('id') id: string,
    @Body() dto: Parameters<AdminService['updatePromoCode']>[1],
  ) {
    return this.adminService.updatePromoCode(id, dto);
  }

  @Delete('promo-codes/:id')
  deletePromoCode(@Param('id') id: string) {
    return this.adminService.deletePromoCode(id);
  }

  // ── Moderation ─────────────────────────────────────────────────────────────
  @Get('moderation/flagged')
  getFlaggedItems() {
    return this.adminService.getFlaggedItems();
  }

  @Delete('moderation/chat/:id')
  clearFlaggedChat(@Param('id') id: string) {
    return this.adminService.clearFlaggedChat(id);
  }

  @Delete('moderation/question/:id')
  clearFlaggedQuestion(@Param('id') id: string) {
    return this.adminService.clearFlaggedQuestion(id);
  }

  // ── User Reports ───────────────────────────────────────────────────────────
  @Get('reports')
  getReports(@Query('status') status?: UserReportStatus) {
    return this.userBlocksService.findReports(status);
  }

  @Patch('reports/:id')
  async updateReport(
    @Param('id') id: string,
    @Body() body: { status: UserReportStatus; adminNote?: string },
    @Req() req: Request & { user: AuthUser },
  ) {
    const result = await this.userBlocksService.updateReportStatus(
      id,
      body.status,
      body.adminNote,
    );
    await this.adminAuditService.logAction(req.user.id, 'report.update', 'report', id, body as unknown as Record<string, unknown>);
    return result;
  }
}
