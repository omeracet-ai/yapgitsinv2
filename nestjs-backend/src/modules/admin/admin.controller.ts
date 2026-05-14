import { Controller, Get, Patch, Post, Delete, Body, Param, Query, UseGuards, UseInterceptors, Req, Res, NotFoundException } from '@nestjs/common';
import { Audit } from '../admin-audit/audit.decorator';
import { AuditInterceptor } from '../admin-audit/audit.interceptor';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { CategoriesService } from '../categories/categories.service';
import { ProvidersService } from '../providers/providers.service';
import { Category } from '../categories/category.entity';
import { UserBlocksService } from '../user-blocks/user-blocks.service';
import type { UserReportStatus } from '../user-blocks/user-report.entity';
import { UpdateReportStatusDto } from '../user-blocks/dto/report-user.dto';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { AdminListQueryDto } from './dto/admin-list-query.dto';
import { BulkVerifyDto } from './dto/bulk-verify.dto';
import { BulkFeatureDto, BulkUnfeatureDto } from './dto/bulk-feature.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { PurgeAuditLogDto } from './dto/purge-audit-log.dto';
import { AdminGuard } from '../../common/guards/admin.guard';
import { WorkerInsuranceService } from '../users/worker-insurance.service';
import { WorkerCertificationService } from '../users/worker-certification.service';
import { DataPrivacyService } from '../users/data-privacy.service';
import { DataDeletionRequestStatus } from '../users/data-deletion-request.entity';
import type { Request } from 'express';
import type { AuthUser } from '../../common/types/auth.types';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
@UseInterceptors(AuditInterceptor)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly categoriesService: CategoriesService,
    private readonly providersService: ProvidersService,
    private readonly userBlocksService: UserBlocksService,
    private readonly adminAuditService: AdminAuditService,
    private readonly systemSettings: SystemSettingsService,
    private readonly insuranceSvc: WorkerInsuranceService,
    private readonly certificationSvc: WorkerCertificationService,
    private readonly dataPrivacy: DataPrivacyService,
  ) {}

  // ── Phase 159: Worker certifications verify queue ─────────────────
  @Get('certifications')
  async listPendingCertifications() {
    return this.certificationSvc.listPending();
  }

  @Audit('certification.verify')
  @Patch('certifications/:id/verify')
  async verifyCertification(
    @Param('id') id: string,
    @Body() body: { adminNote?: string },
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.certificationSvc.setVerified(id, true, req.user.id, body.adminNote);
  }

  @Audit('certification.reject')
  @Patch('certifications/:id/reject')
  async rejectCertification(
    @Param('id') id: string,
    @Body() body: { adminNote?: string },
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.certificationSvc.setVerified(id, false, req.user.id, body.adminNote);
  }

  // ── Phase 124: KVKK data deletion request moderation ─────────────
  @Get('data-deletion-requests')
  async listDataDeletionRequests(@Query('status') status?: string) {
    const validStatuses = Object.values(DataDeletionRequestStatus) as string[];
    const filter = status && validStatuses.includes(status)
      ? (status as DataDeletionRequestStatus)
      : undefined;
    return this.dataPrivacy.listDeletionRequests(filter);
  }

  @Patch('data-deletion-requests/:id')
  async moderateDataDeletionRequest(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; adminNote?: string },
    @Req() req: Request & { user: AuthUser },
  ) {
    if (body.action !== 'approve' && body.action !== 'reject') {
      throw new Error('action approve veya reject olmalı');
    }
    const result = await this.dataPrivacy.moderateDeletionRequest(
      id,
      body.action,
      req.user.id,
      body.adminNote,
    );
    await this.adminAuditService.logAction(
      req.user.id,
      `data_deletion.${body.action}`,
      'data_deletion_request',
      id,
      body as unknown as Record<string, unknown>,
    );
    return result;
  }

  @Post('data-deletion-requests/:id/execute')
  async executeDataDeletion(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    const result = await this.dataPrivacy.executeDeletion(id, req.user.id);
    await this.adminAuditService.logAction(
      req.user.id,
      'data_deletion.execute',
      'data_deletion_request',
      id,
      { userId: result.userId },
    );
    return result;
  }

  // ── Phase 119: Worker insurance verify ────────────────────────────
  @Patch('users/:id/insurance/verify')
  async verifyInsurance(
    @Param('id') id: string,
    @Body() body: { verified: boolean },
    @Req() req: Request & { user: AuthUser },
  ) {
    const result = await this.insuranceSvc.setVerified(id, !!body.verified, req.user.id);
    await this.adminAuditService.logAction(
      req.user.id,
      'user.insurance.verify',
      'user',
      id,
      body as unknown as Record<string, unknown>,
    );
    return result;
  }

  // ── System Settings ─────────────────────────────────────────────────────────
  @Get('settings')
  async listSettings() {
    return this.systemSettings.getAll();
  }

  @Get('settings/:key')
  async getSetting(@Param('key') key: string) {
    const value = await this.systemSettings.get(key, '');
    return { key, value };
  }

  @Audit('setting.update')
  @Patch('settings/:key')
  async updateSetting(
    @Param('key') key: string,
    @Body() body: { value: string },
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.systemSettings.set(key, body.value, req.user.id);
  }

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

  @Get('audit-log/purge-preview')
  getAuditLogPurgePreview(@Query('olderThanDays') olderThanDays?: string) {
    const raw = Number(olderThanDays);
    const parsed = Number.isFinite(raw) ? Math.floor(raw) : 30;
    const clamped = Math.max(30, Math.min(365, parsed));
    return this.adminAuditService.previewPurge(clamped);
  }

  @Post('audit-log/purge')
  async purgeAuditLog(
    @Body() body: PurgeAuditLogDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.adminAuditService.purgeOlderThan(body.olderThanDays, req.user.id);
  }

  // Phase 182 — single audit-log entry lookup. Declared AFTER static
  // `/audit-log/...` routes so they win path resolution.
  @Get('audit-log/:id')
  async getAuditLogEntry(@Param('id') id: string) {
    const entry = await this.adminAuditService.findOne(id);
    if (!entry) throw new NotFoundException('Audit log entry not found');
    return entry;
  }

  @Get('stats')
  getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('revenue')
  getRevenue() {
    return this.adminService.getRevenue();
  }

  // P191/4 — paginated admin jobs list.
  // Back-compat: with no `page` param and a `limit`, falls back to legacy
  // unpaginated array shape so existing clients (dashboard "recent jobs")
  // don't break mid-deploy.
  @Get('jobs')
  getRecentJobs(@Query() query: AdminListQueryDto) {
    const hasPaging =
      query.page !== undefined ||
      query.search !== undefined ||
      query.status !== undefined;
    if (!hasPaging) {
      return this.adminService.getRecentJobs(query.limit ? Number(query.limit) : 20);
    }
    return this.adminService.getJobsPaged(query);
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

  // P191/4 — paginated admin users list.
  // Back-compat: returns flat array when called without paging params.
  @Get('users')
  getUsers(@Query() query: AdminListQueryDto) {
    const hasPaging =
      query.page !== undefined ||
      query.limit !== undefined ||
      query.search !== undefined ||
      query.status !== undefined;
    if (!hasPaging) {
      return this.adminService.getAllUsers();
    }
    return this.adminService.getUsersPaged(query);
  }

  @Post('users/bulk-verify')
  async bulkVerifyUsers(
    @Body() dto: BulkVerifyDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.adminService.bulkVerifyUsers(dto, req.user.id);
  }

  @Post('users/bulk-feature')
  async bulkFeatureUsers(
    @Body() dto: BulkFeatureDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.adminService.bulkFeatureWorkers(dto, req.user.id);
  }

  @Post('users/bulk-unfeature')
  async bulkUnfeatureUsers(
    @Body() dto: BulkUnfeatureDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.adminService.bulkUnfeatureWorkers(dto, req.user.id);
  }

  @Audit('user.suspend')
  @Patch('users/:id/suspend')
  async suspendUser(
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.adminService.suspendUser(id, dto, req.user.id);
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

  // P191/4 — paginated admin providers list.
  // Back-compat: returns flat array when called without paging params.
  @Get('providers')
  getProviders(@Query() query: AdminListQueryDto) {
    const hasPaging =
      query.page !== undefined ||
      query.limit !== undefined ||
      query.search !== undefined ||
      query.status !== undefined;
    if (!hasPaging) {
      return this.providersService.findAll();
    }
    return this.providersService.findAllPaged(query);
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

  // ── Phase 137 — Manual badge grant/revoke ───────────────────────────
  @Audit('user.badge.grant')
  @Post('users/:id/badges/grant')
  async grantManualBadge(
    @Param('id') id: string,
    @Body() body: { badgeKey: string },
  ) {
    return this.adminService.grantManualBadge(id, body.badgeKey);
  }

  @Audit('user.badge.revoke')
  @Post('users/:id/badges/revoke')
  async revokeManualBadge(
    @Param('id') id: string,
    @Body() body: { badgeKey: string },
  ) {
    return this.adminService.revokeManualBadge(id, body.badgeKey);
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

  // Phase 116: AI fraud detection moderation queue
  @Get('moderation/queue')
  getModerationQueue(
    @Query('type') type: 'job' | 'review' | 'chat' = 'job',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getModerationQueue(
      type,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Patch('moderation/:type/:id')
  async moderateItem(
    @Param('type') type: 'job' | 'review' | 'chat',
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'remove' | 'ban_user' },
    @Req() req: Request & { user: AuthUser },
  ) {
    const result = await this.adminService.moderateItem(type, id, body.action);
    await this.adminAuditService.logAction(
      req.user.id,
      `moderation.${type}.${body.action}`,
      type,
      id,
      { action: body.action },
    );
    return result;
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
  @Get('notifications/broadcast/history')
  async broadcastHistory() {
    return this.adminService.getBroadcastHistory();
  }

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
  getReports(
    @Query('status') status?: UserReportStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.userBlocksService.findReportsPaged(
      status,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Patch('reports/:id/status')
  async updateReportStatus(
    @Param('id') id: string,
    @Body() body: UpdateReportStatusDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    const result = await this.userBlocksService.updateReportStatus(
      id,
      body.status,
      body.adminNote,
    );
    await this.adminAuditService.logAction(
      req.user.id,
      'report.review',
      'report',
      id,
      { newStatus: body.status, reason: result.reason },
    );
    return result;
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
