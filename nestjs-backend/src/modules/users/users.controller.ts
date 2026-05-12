import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  Res,
  ParseUUIDPipe,
  ParseIntPipe,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type { Response } from 'express';
import { AddOfferTemplateDto } from './dto/add-offer-template.dto';
import { AddMessageTemplateDto } from './dto/add-message-template.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { DataPrivacyService } from './data-privacy.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { FavoriteWorkersService } from './favorite-workers.service';
import { EarningsService } from './earnings.service';
import { WorkerInsuranceService } from './worker-insurance.service';
import { WorkerCertificationService } from './worker-certification.service';
import { CalendarSyncService } from './calendar-sync.service';
import { Job, JobStatus } from '../jobs/job.entity';
import { Review } from '../reviews/review.entity';
import { Offer, OfferStatus } from '../jobs/offer.entity';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@Controller('users')
export class UsersController {
  constructor(
    private readonly svc: UsersService,
    private readonly favWorkersSvc: FavoriteWorkersService,
    private readonly earningsSvc: EarningsService,
    private readonly insuranceSvc: WorkerInsuranceService,
    private readonly certificationSvc: WorkerCertificationService,
    private readonly calendarSyncSvc: CalendarSyncService,
    private readonly adminAuditService: AdminAuditService,
    private readonly dataPrivacy: DataPrivacyService,
    @InjectRepository(Job) private jobsRepo: Repository<Job>,
    @InjectRepository(Review) private reviewsRepo: Repository<Review>,
    @InjectRepository(Offer) private offersRepo: Repository<Offer>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /** Phase 170 — public worker profile cache key + TTL (ms). */
  private static profileCacheKey(id: string): string {
    return `worker:profile:${id}`;
  }
  private static readonly PROFILE_CACHE_TTL = 60 * 1000; // 1 dk

  /** Profil değiştiren operasyonlardan sonra çağrılır. */
  private async invalidateProfileCache(id: string): Promise<void> {
    try {
      await this.cache.del(UsersController.profileCacheKey(id));
    } catch {
      /* cache erişilemezse sessiz geç */
    }
  }

  // ── Favorite workers ──────────────────────────────────────────────
  @UseGuards(AuthGuard('jwt'))
  @Get('me/favorites')
  listFavoriteWorkers(@Request() req: AuthenticatedRequest) {
    return this.favWorkersSvc.listFavorites(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/favorites/:workerId')
  addFavoriteWorker(
    @Request() req: AuthenticatedRequest,
    @Param('workerId', ParseUUIDPipe) workerId: string,
  ) {
    return this.favWorkersSvc.addFavorite(req.user.id, workerId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('me/favorites/:workerId')
  removeFavoriteWorker(
    @Request() req: AuthenticatedRequest,
    @Param('workerId', ParseUUIDPipe) workerId: string,
  ) {
    return this.favWorkersSvc.removeFavorite(req.user.id, workerId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Request() req: AuthenticatedRequest) {
    const user = await this.svc.findById(req.user.id);
    if (!user) return null;
    const { passwordHash: _ph, ...safe } = user as {
      passwordHash?: string;
    } & typeof user;
    const profileCompletion = this.svc.computeProfileCompletion(user);
    const badges = await this.svc.computeBadges(user);
    return { ...safe, profileCompletion, badges };
  }

  // ── Phase 111: Worker earnings dashboard ─────────────────────────
  @UseGuards(AuthGuard('jwt'))
  @Get('me/earnings')
  async getMyEarnings(
    @Request() req: AuthenticatedRequest,
    @Query('months') monthsRaw?: string,
  ) {
    const months = monthsRaw ? parseInt(monthsRaw, 10) : 6;
    return this.earningsSvc.getEarnings(req.user.id, isNaN(months) ? 6 : months);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/completion')
  getMyCompletion(@Request() req: AuthenticatedRequest) {
    return this.svc.getCompletionScore(req.user.id);
  }

  // Phase 49: bildirim tercihleri (kategori bazlı opt-out)
  @UseGuards(AuthGuard('jwt'))
  @Get('me/notification-preferences')
  getNotificationPreferences(@Request() req: AuthenticatedRequest) {
    return this.svc.getNotificationPreferences(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me/notification-preferences')
  updateNotificationPreferences(
    @Request() req: AuthenticatedRequest,
    @Body() body: {
      preferences?: Partial<{
        booking: boolean;
        offer: boolean;
        review: boolean;
        message: boolean;
        system: boolean;
      }> | null;
    },
  ) {
    return this.svc.updateNotificationPreferences(
      req.user.id,
      body?.preferences ?? null,
    );
  }

  // ── Phase 51: Worker offer templates (max 5) ─────────────────────
  @UseGuards(AuthGuard('jwt'))
  @Get('me/offer-templates')
  getOfferTemplates(@Request() req: AuthenticatedRequest) {
    return this.svc.getOfferTemplates(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/offer-templates')
  addOfferTemplate(
    @Request() req: AuthenticatedRequest,
    @Body() body: AddOfferTemplateDto,
  ) {
    return this.svc.addOfferTemplate(req.user.id, body.text);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('me/offer-templates/:index')
  removeOfferTemplate(
    @Request() req: AuthenticatedRequest,
    @Param('index', ParseIntPipe) index: number,
  ) {
    return this.svc.removeOfferTemplate(req.user.id, index);
  }

  // ── Phase 138: Customer message templates (max 5) ─────────────────
  @UseGuards(AuthGuard('jwt'))
  @Get('me/message-templates')
  getMessageTemplates(@Request() req: AuthenticatedRequest) {
    return this.svc.getMessageTemplates(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/message-templates')
  addMessageTemplate(
    @Request() req: AuthenticatedRequest,
    @Body() body: AddMessageTemplateDto,
  ) {
    return this.svc.addMessageTemplate(req.user.id, body.text);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('me/message-templates/:index')
  removeMessageTemplate(
    @Request() req: AuthenticatedRequest,
    @Param('index', ParseIntPipe) index: number,
  ) {
    return this.svc.removeMessageTemplate(req.user.id, index);
  }

  // Phase 44: haftalık müsaitlik takvimi
  @UseGuards(AuthGuard('jwt'))
  @Patch('me/availability')
  updateAvailability(
    @Request() req: AuthenticatedRequest,
    @Body() body: { schedule?: Record<string, unknown> | null },
  ) {
    return this.svc.updateAvailability(req.user.id, body?.schedule ?? null);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me/location')
  async updateLocation(
    @Request() req: AuthenticatedRequest,
    @Body() body: { latitude: number; longitude: number },
  ) {
    await this.svc.updateLocation(req.user.id, body.latitude, body.longitude);
    return { ok: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  async updateMe(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      fullName?: string;
      email?: string;
      phoneNumber?: string;
      birthDate?: string;
      gender?: string;
      city?: string;
      district?: string;
      address?: string;
      identityPhotoUrl?: string;
      documentPhotoUrl?: string;
      profileImageUrl?: string;
      profileVideoUrl?: string;
      workerCategories?: string[];
      workerSkills?: string[];
      workerBio?: string;
      hourlyRateMin?: number;
      hourlyRateMax?: number;
      serviceRadiusKm?: number;
      isAvailable?: boolean;
    },
  ) {
    // Tasker can manage their own skills — sanitize like admin endpoint does
    if (body.workerSkills) {
      body.workerSkills = Array.from(
        new Set(
          body.workerSkills
            .map((s) => (typeof s === 'string' ? s.trim() : ''))
            .filter((s) => s.length > 0 && s.length <= 50),
        ),
      ).slice(0, 20);
    }
    const updated = await this.svc.update(req.user.id, body);
    if (!updated) return null;
    await this.invalidateProfileCache(req.user.id);
    const { passwordHash: _ph, ...safe } = updated as {
      passwordHash?: string;
    } & typeof updated;
    return safe;
  }

  // ── Phase 113: FCM device token register ──────────────────────────
  @UseGuards(AuthGuard('jwt'))
  @Post('me/fcm-token')
  async registerFcmToken(
    @Request() req: AuthenticatedRequest,
    @Body() body: { token?: string },
  ) {
    const tokens = await this.svc.addFcmToken(req.user.id, body?.token ?? '');
    return { tokens };
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('me/fcm-token')
  async unregisterFcmToken(
    @Request() req: AuthenticatedRequest,
    @Body() body: { token?: string },
  ) {
    const tokens = await this.svc.removeFcmToken(req.user.id, body?.token ?? '');
    return { tokens };
  }

  // ── Phase 119: Worker insurance ──────────────────────────────────
  @UseGuards(AuthGuard('jwt'))
  @Get('me/insurance')
  async getMyInsurance(@Request() req: AuthenticatedRequest) {
    const ins = await this.insuranceSvc.getByUserId(req.user.id);
    return ins ?? null;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/insurance')
  async upsertMyInsurance(
    @Request() req: AuthenticatedRequest,
    @Body() body: {
      policyNumber: string;
      provider: string;
      coverageAmount: number;
      expiresAt: string;
      documentUrl?: string | null;
    },
  ) {
    return this.insuranceSvc.upsert(req.user.id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('me/insurance')
  async deleteMyInsurance(@Request() req: AuthenticatedRequest) {
    return this.insuranceSvc.remove(req.user.id);
  }

  // ── Phase 159: Worker certifications ──────────────────────────────
  @UseGuards(AuthGuard('jwt'))
  @Get('me/certifications')
  async listMyCertifications(@Request() req: AuthenticatedRequest) {
    return this.certificationSvc.listOwn(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/certifications')
  async addMyCertification(
    @Request() req: AuthenticatedRequest,
    @Body() body: {
      name: string;
      issuer: string;
      issuedAt: string;
      expiresAt?: string | null;
      documentUrl?: string | null;
    },
  ) {
    return this.certificationSvc.create(req.user.id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('me/certifications/:id')
  async deleteMyCertification(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.certificationSvc.deleteOwn(req.user.id, id);
  }

  @Get(':userId/certifications')
  async getPublicCertifications(@Param('userId') userId: string) {
    const list = await this.certificationSvc.listPublic(userId);
    return list.map((c) => this.certificationSvc.toPublic(c));
  }

  @Get(':id/insurance')
  async getPublicInsurance(@Param('id') id: string) {
    const ins = await this.insuranceSvc.getByUserId(id);
    if (!ins) return null;
    if (!this.insuranceSvc.isInsured(ins)) return null;
    return this.insuranceSvc.toPublic(ins);
  }

  // ── Phase 124: KVKK data export (Madde 11) ───────────────────────
  @UseGuards(AuthGuard('jwt'))
  @Get('me/data-export')
  async exportMyData(
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const data = await this.dataPrivacy.exportUserData(req.user.id);
    const stamp = new Date().toISOString().slice(0, 10);
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set(
      'Content-Disposition',
      `attachment; filename="yapgitsin-veriler-${req.user.id}-${stamp}.json"`,
    );
    res.send(JSON.stringify(data, null, 2));
  }

  // ── Phase 124: KVKK data deletion request ─────────────────────────
  @UseGuards(AuthGuard('jwt'))
  @Post('me/data-delete-request')
  async requestDataDeletion(
    @Request() req: AuthenticatedRequest,
    @Body() body: { reason?: string },
  ) {
    const reason = (body?.reason || '').trim() || null;
    const result = await this.dataPrivacy.createDeletionRequest(req.user.id, reason);
    await this.adminAuditService.logAction(
      req.user.id,
      'user.data_delete_request',
      'data_deletion_request',
      result.id,
      { reason },
    );
    return result;
  }

  // ── Phase 60: Account self-deletion (KVKK) ────────────────────────
  @UseGuards(AuthGuard('jwt'))
  @Delete('me')
  async deleteMe(
    @Request() req: AuthenticatedRequest,
    @Body() body: DeleteAccountDto,
  ) {
    const result = await this.svc.deactivateAccount(req.user.id, body.password);
    await this.adminAuditService.logAction(
      req.user.id,
      'user.self_delete',
      'user',
      req.user.id,
      { userId: req.user.id },
    );
    return result;
  }

  // ── Phase 43: Worker portfolio photos ─────────────────────────────
  @UseGuards(AuthGuard('jwt'))
  @Post('me/portfolio')
  async addPortfolioPhoto(
    @Request() req: AuthenticatedRequest,
    @Body() body: { url: string },
  ) {
    const url = (body?.url || '').trim();
    if (!url) throw new BadRequestException('url gerekli');
    const user = await this.svc.findById(req.user.id);
    if (!user) return null;
    const current = Array.isArray(user.portfolioPhotos) ? user.portfolioPhotos : [];
    if (current.length >= 10) {
      throw new BadRequestException('En fazla 10 portfolyo fotoğrafı eklenebilir');
    }
    if (current.includes(url)) return { portfolioPhotos: current };
    const next = [...current, url];
    await this.svc.update(req.user.id, { portfolioPhotos: next });
    return { portfolioPhotos: next };
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('me/portfolio')
  async removePortfolioPhoto(
    @Request() req: AuthenticatedRequest,
    @Body() body: { url: string },
  ) {
    const url = (body?.url || '').trim();
    const user = await this.svc.findById(req.user.id);
    if (!user) return null;
    const current = Array.isArray(user.portfolioPhotos) ? user.portfolioPhotos : [];
    const next = current.filter((u) => u !== url);
    await this.svc.update(req.user.id, { portfolioPhotos: next });
    return { portfolioPhotos: next };
  }

  // ── Phase 125: Worker portfolio videos ────────────────────────────
  @UseGuards(AuthGuard('jwt'))
  @Post('me/portfolio-video')
  async addPortfolioVideo(
    @Request() req: AuthenticatedRequest,
    @Body() body: { url: string },
  ) {
    const url = (body?.url || '').trim();
    if (!url) throw new BadRequestException('url gerekli');
    const user = await this.svc.findById(req.user.id);
    if (!user) return null;
    const current = Array.isArray(user.portfolioVideos) ? user.portfolioVideos : [];
    if (current.length >= 3) {
      throw new BadRequestException('En fazla 3 portfolyo videosu eklenebilir');
    }
    if (current.includes(url)) return { videos: current };
    const next = [...current, url];
    await this.svc.update(req.user.id, { portfolioVideos: next });
    return { videos: next };
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('me/portfolio-video')
  async removePortfolioVideo(
    @Request() req: AuthenticatedRequest,
    @Body() body: { url: string },
  ) {
    const url = (body?.url || '').trim();
    const user = await this.svc.findById(req.user.id);
    if (!user) return null;
    const current = Array.isArray(user.portfolioVideos) ? user.portfolioVideos : [];
    const next = current.filter((u) => u !== url);
    await this.svc.update(req.user.id, { portfolioVideos: next });
    return { videos: next };
  }

  // ── Phase 152: Worker intro video (60sec cap) ─────────────────────
  @UseGuards(AuthGuard('jwt'))
  @Post('me/intro-video')
  async setIntroVideo(
    @Request() req: AuthenticatedRequest,
    @Body() body: { url: string; duration?: number | null },
  ) {
    const url = (body?.url || '').trim();
    if (!url) throw new BadRequestException('url gerekli');
    const dur = typeof body?.duration === 'number' ? Math.round(body.duration) : null;
    if (dur != null && dur > 65) {
      throw new BadRequestException('Tanıtım videosu 60 saniyeyi geçemez');
    }
    await this.svc.update(req.user.id, {
      introVideoUrl: url,
      introVideoDuration: dur,
    });
    return { introVideoUrl: url, introVideoDuration: dur };
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('me/intro-video')
  async removeIntroVideo(@Request() req: AuthenticatedRequest) {
    await this.svc.update(req.user.id, {
      introVideoUrl: null,
      introVideoDuration: null,
    });
    return { introVideoUrl: null, introVideoDuration: null };
  }

  // ── Phase 155 — Worker calendar ICS feed (Google/Apple/Outlook subscribe) ──
  @UseGuards(AuthGuard('jwt'))
  @Post('me/calendar/enable')
  enableCalendar(@Request() req: AuthenticatedRequest) {
    return this.calendarSyncSvc.enable(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/calendar/regenerate')
  regenerateCalendar(@Request() req: AuthenticatedRequest) {
    return this.calendarSyncSvc.regenerate(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/calendar/disable')
  disableCalendar(@Request() req: AuthenticatedRequest) {
    return this.calendarSyncSvc.disable(req.user.id);
  }

  /** Public-by-token ICS feed. NO auth — token in query string is the auth. */
  @Get(':userId/calendar.ics')
  async getCalendarIcs(
    @Param('userId') userId: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const ics = await this.calendarSyncSvc.generateIcs(userId, token || '');
    if (!ics) {
      res.status(404).send('Not Found');
      return;
    }
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Content-Disposition', 'inline; filename="yapgitsin-takvim.ics"');
    res.send(ics);
  }

  /**
   * Phase 177 — Geohash-indexed nearby workers.
   * GET /users/workers/nearby?lat=&lon=&radius=20&category=&verifiedOnly=
   * Uses prefix index + equirectangular distance (~10x faster than Haversine).
   */
  @Get('workers/nearby')
  async getNearbyWorkers(
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('radius') radius?: string,
    @Query('category') category?: string,
    @Query('verifiedOnly') verifiedOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parseNum = (v?: string): number | undefined => {
      if (v == null || v === '') return undefined;
      const n = parseFloat(v);
      return isNaN(n) ? undefined : n;
    };
    const latN = parseNum(lat);
    const lonN = parseNum(lon);
    if (latN == null || lonN == null) {
      return { data: [], total: 0, page: 1, limit: 20, pages: 0 };
    }
    const result = await this.svc.findNearbyWorkers({
      lat: latN,
      lon: lonN,
      radiusKm: parseNum(radius),
      category,
      verifiedOnly: verifiedOnly === 'true',
      page: parseNum(page),
      limit: parseNum(limit),
    });
    const data = result.data.map((u) => {
      const { passwordHash: _ph, ...safe } = u as { passwordHash?: string } & typeof u;
      return safe;
    });
    return { ...result, data };
  }

  /** GET /workers — Usta dizini (advanced filters + pagination) */
  @Get('workers')
  async getWorkers(
    @Query('category') category?: string,
    @Query('city') city?: string,
    @Query('minRating') minRating?: string,
    @Query('minRate') minRate?: string,
    @Query('maxRate') maxRate?: string,
    @Query('verifiedOnly') verifiedOnly?: string,
    @Query('availableOnly') availableOnly?: string,
    @Query('availableDay') availableDay?: string,
    @Query('sortBy') sortBy?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('semanticQuery') semanticQuery?: string,
  ) {
    const parseNum = (v?: string): number | undefined => {
      if (v == null || v === '') return undefined;
      const n = parseFloat(v);
      return isNaN(n) ? undefined : n;
    };
    const parseBool = (v?: string): boolean | undefined => {
      if (v == null || v === '') return undefined;
      if (v === 'true') return true;
      if (v === 'false') return false;
      return undefined;
    };

    const minRatingN = parseNum(minRating);
    const sortAllowed = ['rating', 'reputation', 'rate_asc', 'rate_desc', 'nearest'];
    const sortByVal = sortBy && sortAllowed.includes(sortBy)
      ? (sortBy as 'rating' | 'reputation' | 'rate_asc' | 'rate_desc' | 'nearest')
      : undefined;
    const latN = parseNum(lat);
    const lngN = parseNum(lng);
    const radiusN = parseNum(radiusKm);

    const result = await this.svc.findWorkersAdvanced({
      category,
      city,
      minRating: minRatingN != null ? Math.min(5, Math.max(0, minRatingN)) : undefined,
      minRate: parseNum(minRate),
      maxRate: parseNum(maxRate),
      verifiedOnly: parseBool(verifiedOnly),
      availableOnly: parseBool(availableOnly),
      availableDay: (['mon','tue','wed','thu','fri','sat','sun'] as const).includes(
        availableDay as 'mon',
      )
        ? (availableDay as 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')
        : undefined,
      sortBy: sortByVal,
      page: parseNum(page),
      limit: parseNum(limit),
      lat: latN,
      lng: lngN,
      radiusKm: radiusN != null ? Math.min(200, Math.max(1, radiusN)) : undefined,
      semanticQuery: semanticQuery && semanticQuery.trim().length > 0
        ? semanticQuery.trim().slice(0, 200)
        : undefined,
    });

    // Phase 146 — bulk subscription lookup to avoid N+1 in worker list
    const planMap = await this.svc.getActiveSubscriptionPlanKeys(result.data.map((u) => u.id));
    const data = await Promise.all(result.data.map(async (u) => {
      const { passwordHash: _ph, ...safe } = u as {
        passwordHash?: string;
      } & typeof u;
      const badges = await this.svc.computeBadges(u, planMap.get(u.id) ?? null);
      return { ...safe, badges };
    }));
    return { ...result, data };
  }

  /** Phase 135 — Public availability slots (next N days). */
  @Get(':id/availability-slots')
  async getAvailabilitySlots(
    @Param('id') id: string,
    @Query('days') daysRaw?: string,
  ) {
    const d = daysRaw ? parseInt(daysRaw, 10) : 30;
    return this.svc.getAvailabilitySlots(id, isNaN(d) ? 30 : d);
  }

  /** Phase 133 — Public customer profile (no worker fields). */
  @Get(':id/customer-profile')
  async getCustomerProfile(@Param('id') id: string) {
    const user = await this.svc.findById(id);
    if (!user) return null;

    const reviews = await this.reviewsRepo.find({
      where: { revieweeId: id },
      relations: ['reviewer'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // Bu kullanıcı müşteri olarak aldığı yorumları filtrele:
    // reviewer = ustaysa (workerCategories doluysa) müşteri rolüyle aldığı yorum
    const customerReviews = reviews.filter((r) => {
      const wc = r.reviewer?.workerCategories;
      return Array.isArray(wc) && wc.length > 0;
    });

    const completedJobsCount = await this.jobsRepo.count({
      where: { customerId: id, status: JobStatus.COMPLETED },
    });

    // Phase 145 — enrichment: monthlyActivity (last 6mo), topCategories, avgBudget, lastCompletedJobs
    const completedJobs = await this.jobsRepo.find({
      where: { customerId: id, status: JobStatus.COMPLETED },
      order: { updatedAt: 'DESC' },
      take: 200,
    });

    // Last 6 months activity
    const now = new Date();
    const months: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ month: key, count: 0 });
    }
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    for (const j of completedJobs) {
      const dt = j.updatedAt ? new Date(j.updatedAt) : null;
      if (!dt || dt < sixMonthsAgo) continue;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const slot = months.find((m) => m.month === key);
      if (slot) slot.count++;
    }

    // Top categories
    const catMap = new Map<string, number>();
    for (const j of completedJobs) {
      if (!j.category) continue;
      catMap.set(j.category, (catMap.get(j.category) ?? 0) + 1);
    }
    const topCategories = [...catMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, count]) => ({ category, count }));

    // Avg budget (mid of min/max if both, else whichever exists)
    let budgetSum = 0;
    let budgetCount = 0;
    for (const j of completedJobs) {
      const lo = Number(j.budgetMin) || 0;
      const hi = Number(j.budgetMax) || 0;
      let val = 0;
      if (lo > 0 && hi > 0) val = (lo + hi) / 2;
      else if (lo > 0) val = lo;
      else if (hi > 0) val = hi;
      if (val > 0) {
        budgetSum += val;
        budgetCount++;
      }
    }
    const avgBudget = budgetCount > 0 ? Math.round(budgetSum / budgetCount) : 0;

    const lastCompletedJobs = completedJobs.slice(0, 5).map((j) => ({
      id: j.id,
      title: j.title,
      category: j.category,
      completedAt: j.updatedAt,
      budget:
        Number(j.budgetMin) > 0 && Number(j.budgetMax) > 0
          ? (Number(j.budgetMin) + Number(j.budgetMax)) / 2
          : Number(j.budgetMin) || Number(j.budgetMax) || 0,
    }));

    const total = user.asCustomerTotal ?? 0;
    const success = user.asCustomerSuccess ?? 0;
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

    return {
      id: user.id,
      fullName: user.fullName,
      profileImageUrl: user.profileImageUrl ?? null,
      joinedAt: user.createdAt,
      identityVerified: user.identityVerified === true,
      asCustomerTotal: total,
      asCustomerSuccess: success,
      customerSuccessRate: successRate,
      completedJobsCount,
      monthlyActivity: months,
      topCategories,
      avgBudget,
      lastCompletedJobs,
      reviewsReceivedAsCustomer: customerReviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        reviewerName: r.reviewer?.fullName ?? 'Usta',
        createdAt: r.createdAt,
      })),
    };
  }

  /** GET /users/:id/profile — public (Phase 170: 60s cache, profil güncellemesinde invalidate). */
  @Get(':id/profile')
  async getPublicProfile(@Param('id') id: string) {
    const cacheKey = UsersController.profileCacheKey(id);
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached !== undefined && cached !== null) return cached;
    } catch {
      /* cache erişilemezse normal akışa devam */
    }

    const profile = await this.buildPublicProfile(id);
    if (profile !== null) {
      try {
        await this.cache.set(cacheKey, profile, UsersController.PROFILE_CACHE_TTL);
      } catch {
        /* cache yazılamazsa sorun değil */
      }
    }
    return profile;
  }

  private async buildPublicProfile(id: string) {
    const user = await this.svc.findById(id);
    if (!user) return null;

    // 3 bağımsız sorgu paralelde çalışır
    const insurancePromise = this.insuranceSvc.getByUserId(id);
    const [reviews, customerJobs, workerJobs] = await Promise.all([
      // Son 10 değerlendirme
      this.reviewsRepo.find({
        where: { revieweeId: id },
        relations: ['reviewer'],
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      // Müşteri olarak tamamlanmış ilanlar
      this.jobsRepo.find({
        where: { customerId: id, status: JobStatus.COMPLETED },
        order: { updatedAt: 'DESC' },
        take: 20,
      }),
      // Usta olarak tamamlanmış işler — DB'de filtrele
      this.offersRepo
        .createQueryBuilder('offer')
        .innerJoinAndSelect('offer.job', 'job')
        .where('offer.userId = :id', { id })
        .andWhere('offer.status = :offerStatus', { offerStatus: OfferStatus.ACCEPTED })
        .andWhere('job.status = :jobStatus', { jobStatus: JobStatus.COMPLETED })
        .orderBy('offer.updatedAt', 'DESC')
        .take(20)
        .getMany()
        .then((offers) => offers.map((o) => o.job)),
    ]);

    const allPhotoJobs = [...customerJobs, ...(workerJobs as typeof customerJobs)];
    const pastPhotos: string[] = [];
    for (const job of allPhotoJobs) {
      if (pastPhotos.length >= 4) break;
      if (job?.photos?.length) {
        pastPhotos.push(...job.photos.slice(0, 4 - pastPhotos.length));
      }
    }

    // ── Gerçek zamanlı avg (DB'dekini de güncelle) ────────────────────────
    const avgRating = reviews.length
      ? Math.round(
          (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10,
        ) / 10
      : 0;

    const reputation =
      Math.round(avgRating * 20) +
      (user.asCustomerSuccess + user.asWorkerSuccess) * 5;

    const { passwordHash: _ph, ...safe } = user as {
      passwordHash?: string;
    } & typeof user;
    // Airtasker-style badges (manuel + computed) — public profile için
    const enrichedUser = {
      ...user,
      averageRating: avgRating,
      totalReviews: reviews.length,
      reputationScore: reputation,
    } as typeof user;
    const insurance = await insurancePromise;
    const insured = this.insuranceSvc.isInsured(insurance);
    const verifiedCerts = await this.certificationSvc.listPublic(id);
    const hasCert = await this.certificationSvc.hasVerifiedCertification(id);
    const badges = await this.svc.computeBadges(enrichedUser);
    if (insured) badges.push({ key: 'insured', label: 'Sigortalı', icon: '🛡️' });
    if (hasCert) badges.push({ key: 'certified', label: 'Sertifikalı', icon: '📜' });

    return {
      ...safe,
      insurance: insured && insurance ? this.insuranceSvc.toPublic(insurance) : null,
      averageRating: avgRating,
      totalReviews: reviews.length,
      reputationScore: reputation,
      badges,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        replyText: r.replyText ?? null,
        repliedAt: r.repliedAt ?? null,
        reviewer: {
          id: r.reviewer?.id,
          fullName: r.reviewer?.fullName,
          profileImageUrl: r.reviewer?.profileImageUrl,
        },
      })),
      pastPhotos,
      portfolioPhotos: Array.isArray(user.portfolioPhotos) ? user.portfolioPhotos : [],
      portfolioVideos: Array.isArray(user.portfolioVideos) ? user.portfolioVideos : [],
      introVideoUrl: user.introVideoUrl ?? null,
      introVideoDuration: user.introVideoDuration ?? null,
      certifications: verifiedCerts.map((c) => this.certificationSvc.toPublic(c)),
    };
  }
}
