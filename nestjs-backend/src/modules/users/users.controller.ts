import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { Job, JobStatus } from '../jobs/job.entity';
import { Review } from '../reviews/review.entity';
import { Offer, OfferStatus } from '../jobs/offer.entity';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@Controller('users')
export class UsersController {
  constructor(
    private readonly svc: UsersService,
    @InjectRepository(Job) private jobsRepo: Repository<Job>,
    @InjectRepository(Review) private reviewsRepo: Repository<Review>,
    @InjectRepository(Offer) private offersRepo: Repository<Offer>,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Request() req: AuthenticatedRequest) {
    const user = await this.svc.findById(req.user.id);
    if (!user) return null;
    const { passwordHash: _ph, ...safe } = user as {
      passwordHash?: string;
    } & typeof user;
    return safe;
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
    },
  ) {
    const updated = await this.svc.update(req.user.id, body);
    if (!updated) return null;
    const { passwordHash: _ph, ...safe } = updated as {
      passwordHash?: string;
    } & typeof updated;
    return safe;
  }

  /** GET /workers?category=Temizlik&city=Istanbul — Usta dizini */
  @Get('workers')
  async getWorkers(
    @Query('category') category?: string,
    @Query('city') city?: string,
  ) {
    const workers = await this.svc.findWorkers(category, city);
    return workers.map((u) => {
      const { passwordHash: _ph, ...safe } = u as {
        passwordHash?: string;
      } & typeof u;
      return safe;
    });
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
    return {
      ...safe,
      averageRating: avgRating,
      totalReviews: reviews.length,
      reputationScore: reputation,
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
    };
  }
}
