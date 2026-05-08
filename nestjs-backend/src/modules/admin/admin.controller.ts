import { Controller, Get, Patch, Post, Delete, Body, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { CategoriesService } from '../categories/categories.service';
import { ProvidersService } from '../providers/providers.service';
import { Category } from '../categories/category.entity';
import { UserBlocksService } from '../user-blocks/user-blocks.service';
import type { UserReportStatus } from '../user-blocks/user-report.entity';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { BulkVerifyDto } from './dto/bulk-verify.dto';
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
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
    @Query('adminUserId') adminUserId?: string,
  ) {
    const parsedLimit = Number(limit) || 50;
    const parsedOffset = Number(offset) || 0;
    const { data, total } = await this.adminAuditService.findFiltered({
      limit: parsedLimit,
      offset: parsedOffset,
      action: action || undefined,
      targetType: targetType || undefined,
      adminUserId: adminUserId || undefined,
    });
    return { data, total, limit: parsedLimit, offset: parsedOffset };
  }

  @Get('audit-log/export')
  async exportAuditLog(
    @Res() res: Response,
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
    @Query('adminUserId') adminUserId?: string,
  ) {
    const csv = await this.adminAuditService.exportCsv({
      action: action || undefined,
      targetType: targetType || undefined,
      adminUserId: adminUserId || undefined,
    });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="audit-log-${stamp}.csv"`);
    res.send(csv);
  }

  @Get('audit-log/stats')
  getAuditLogStats(@Query('days') days?: string) {
    const parsed = Number(days) || 30;
    return this.adminAuditService.getStats(parsed);
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

  @Post('users/bulk-verify')
  async bulkVerifyUsers(
    @Body() dto: BulkVerifyDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.adminService.bulkVerifyUsers(dto, req.user.id);
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
  async updateCategory(
    @Param('id') id: string,
    @Body() body: Partial<Category>,
    @Req() req: Request & { user: AuthUser },
  ) {
    const result = await this.categoriesService.update(id, body);
    await this.adminAuditService.logAction(req.user.id, 'category.update', 'category', id, body as unknown as Record<string, unknown>);
    return result;
  }

  @Get('providers')
  getProviders() {
    return this.providersService.findAll();
  }

  @Patch('providers/:id/verify')
  async verifyProvider(
    @Param('id') id: string,
    @Body() body: { isVerified: boolean },
    @Req() req: Request & { user: AuthUser },
  ) {
    const result = await this.providersService.setVerified(id, body.isVerified);
    await this.adminAuditService.logAction(req.user.id, 'provider.verify', 'provider', id, body as unknown as Record<string, unknown>);
    return result;
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
  async setUserBadges(
    @Param('id') id: string,
    @Body() body: { badges: string[] },
    @Req() req: Request & { user: AuthUser },
  ) {
    const result = await this.adminService.setUserBadges(id, body.badges);
    await this.adminAuditService.logAction(req.user.id, 'user.badges', 'user', id, body as unknown as Record<string, unknown>);
    return result;
  }

  /** Set tasker skills (granular tags beyond workerCategories). */
  @Patch('users/:id/skills')
  async setUserSkills(
    @Param('id') id: string,
    @Body() body: { skills: string[] },
    @Req() req: Request & { user: AuthUser },
  ) {
    const result = await this.adminService.setUserSkills(id, body.skills);
    await this.adminAuditService.logAction(req.user.id, 'user.skills', 'user', id, body as unknown as Record<string, unknown>);
    return result;
  }

  // ── Promo Codes ────────────────────────────────────────────────────────────
  @Get('promo-codes')
  listPromoCodes() {
    return this.adminService.listPromoCodes();
  }

  @Post('promo-codes')
  async createPromoCode(
    @Body() dto: Parameters<AdminService['createPromoCode']>[0],
    @Req() req: Request & { user: AuthUser },
  ) {
    const result = await this.adminService.createPromoCode(dto);
    const created = result as unknown as { id?: string };
    await this.adminAuditService.logAction(req.user.id, 'promo.create', 'promo_code', created?.id ?? '', dto as unknown as Record<string, unknown>);
    return result;
  }

  @Patch('promo-codes/:id')
  async updatePromoCode(
    @Param('id') id: string,
    @Body() dto: Parameters<AdminService['updatePromoCode']>[1],
    @Req() req: Request & { user: AuthUser },
  ) {
    const result = await this.adminService.updatePromoCode(id, dto);
    await this.adminAuditService.logAction(req.user.id, 'promo.update', 'promo_code', id, dto as unknown as Record<string, unknown>);
    return result;
  }

  @Delete('promo-codes/:id')
  async deletePromoCode(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    const result = await this.adminService.deletePromoCode(id);
    await this.adminAuditService.logAction(req.user.id, 'promo.delete', 'promo_code', id);
    return result;
  }

  // ── Moderation ─────────────────────────────────────────────────────────────
  @Get('moderation/flagged')
  getFlaggedItems() {
    return this.adminService.getFlaggedItems();
  }

  @Delete('moderation/chat/:id')
  async clearFlaggedChat(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    const result = await this.adminService.clearFlaggedChat(id);
    await this.adminAuditService.logAction(req.user.id, 'moderation.chat.delete', 'chat_message', id);
    return result;
  }

  @Delete('moderation/question/:id')
  async clearFlaggedQuestion(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    const result = await this.adminService.clearFlaggedQuestion(id);
    await this.adminAuditService.logAction(req.user.id, 'moderation.question.delete', 'job_question', id);
    return result;
  }

  // ── Broadcast Notifications ────────────────────────────────────────────────
  @Post('notifications/broadcast')
  async broadcastNotification(
    @Body() dto: BroadcastNotificationDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    const result = await this.adminService.broadcastNotification(dto);
    await this.adminAuditService.logAction(
      req.user.id,
      'notification.broadcast',
      'notification',
      undefined,
      { segment: result.segment, title: dto.title, sentCount: result.sent },
    );
    return result;
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
