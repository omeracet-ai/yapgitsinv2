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
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { FavoriteWorkersService } from './favorite-workers.service';
import { computeBadges } from './badges.util';
import { Job, JobStatus } from '../jobs/job.entity';
import { Review } from '../reviews/review.entity';
import { Offer, OfferStatus } from '../jobs/offer.entity';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@Controller('users')
export class UsersController {
  constructor(
    private readonly svc: UsersService,
    private readonly favWorkersSvc: FavoriteWorkersService,
    @InjectRepository(Job) private jobsRepo: Repository<Job>,
    @InjectRepository(Review) private reviewsRepo: Repository<Review>,
    @InjectRepository(Offer) private offersRepo: Repository<Offer>,
  ) {}

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
    return { ...safe, profileCompletion };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/completion')
  getMyCompletion(@Request() req: AuthenticatedRequest) {
    return this.svc.getCompletionScore(req.user.id);
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
    const { passwordHash: _ph, ...safe } = updated as {
      passwordHash?: string;
    } & typeof updated;
    return safe;
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
    const sortAllowed = ['rating', 'reputation', 'rate_asc', 'rate_desc'];
    const sortByVal = sortBy && sortAllowed.includes(sortBy)
      ? (sortBy as 'rating' | 'reputation' | 'rate_asc' | 'rate_desc')
      : undefined;

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
    });

    const data = result.data.map((u) => {
      const { passwordHash: _ph, ...safe } = u as {
        passwordHash?: string;
      } & typeof u;
      return safe;
    });
    return { ...result, data };
  }

  /** GET /users/:id/profile — public */
  @Get(':id/profile')
  async getPublicProfile(@Param('id') id: string) {
    const user = await this.svc.findById(id);
    if (!user) return null;

    // 3 bağımsız sorgu paralelde çalışır
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
    const badges = computeBadges(enrichedUser);

    return {
      ...safe,
      averageRating: avgRating,
      totalReviews: reviews.length,
      reputationScore: reputation,
      badges,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        reviewer: {
          id: r.reviewer?.id,
          fullName: r.reviewer?.fullName,
          profileImageUrl: r.reviewer?.profileImageUrl,
        },
      })),
      pastPhotos,
      portfolioPhotos: Array.isArray(user.portfolioPhotos) ? user.portfolioPhotos : [],
    };
  }
}
