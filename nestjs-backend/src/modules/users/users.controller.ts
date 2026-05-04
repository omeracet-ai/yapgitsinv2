import {
  Controller, Get, Patch, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { Job, JobStatus } from '../jobs/job.entity';
import { Review } from '../reviews/review.entity';
import { Offer, OfferStatus } from '../jobs/offer.entity';

@Controller('users')
export class UsersController {
  constructor(
    private readonly svc: UsersService,
    @InjectRepository(Job)    private jobsRepo:    Repository<Job>,
    @InjectRepository(Review) private reviewsRepo: Repository<Review>,
    @InjectRepository(Offer)  private offersRepo:  Repository<Offer>,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Request() req: any) {
    const user = await this.svc.findById(req.user.id);
    if (!user) return null;
    const { passwordHash, ...safe } = user as any;
    return safe;
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  async updateMe(
    @Request() req: any,
    @Body() body: {
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
    const { passwordHash, ...safe } = updated as any;
    return safe;
  }

  /** GET /workers?category=Temizlik&city=Istanbul — Usta dizini */
  @Get('workers')
  async getWorkers(
    @Query('category') category?: string,
    @Query('city')     city?: string,
  ) {
    const all = await this.svc.findAll();
    const workers = all.filter(u =>
      u.isAvailable &&
      u.workerCategories?.length &&
      (category ? u.workerCategories.includes(category) : true) &&
      (city     ? u.city?.toLowerCase().includes(city.toLowerCase()) : true)
    );
    return workers.map(u => {
      const { passwordHash, ...safe } = u as any;
      return safe;
    });
  }

  /** GET /users/:id/profile — public */
  @Get(':id/profile')
  async getPublicProfile(@Param('id') id: string) {
    const user = await this.svc.findById(id);
    if (!user) return null;

    // ── Son 10 değerlendirme ──────────────────────────────────────────────
    const reviews = await this.reviewsRepo.find({
      where:     { revieweeId: id },
      relations: ['reviewer'],
      order:     { createdAt: 'DESC' },
      take:      10,
    });

    // ── Geçmiş fotoğraflar (4 adet) ──────────────────────────────────────
    // 1) Müşteri olarak verdiği tamamlanmış ilanlardan
    const customerJobs = await this.jobsRepo.find({
      where:  { customerId: id, status: JobStatus.COMPLETED },
      order:  { updatedAt: 'DESC' },
      take:   20,
    });

    // 2) Usta olarak kabul edilip tamamlanmış işlerden (offer → job)
    const acceptedOffers = await this.offersRepo.find({
      where:     { userId: id, status: OfferStatus.ACCEPTED },
      relations: ['job'],
      order:     { updatedAt: 'DESC' },
      take:      20,
    });
    const workerJobs = acceptedOffers
      .map(o => o.job)
      .filter(j => j && j.status === JobStatus.COMPLETED);

    const allPhotoJobs = [...customerJobs, ...workerJobs];
    const pastPhotos: string[] = [];
    for (const job of allPhotoJobs) {
      if (pastPhotos.length >= 4) break;
      if (job?.photos?.length) {
        pastPhotos.push(...job.photos.slice(0, 4 - pastPhotos.length));
      }
    }

    // ── Gerçek zamanlı avg (DB'dekini de güncelle) ────────────────────────
    const avgRating = reviews.length
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : 0;

    const reputation = Math.round(avgRating * 20)
      + (user.asCustomerSuccess + user.asWorkerSuccess) * 5;

    const { passwordHash, ...safe } = user as any;
    return {
      ...safe,
      averageRating:   avgRating,
      totalReviews:    reviews.length,
      reputationScore: reputation,
      reviews: reviews.map(r => ({
        id:        r.id,
        rating:    r.rating,
        comment:   r.comment,
        createdAt: r.createdAt,
        reviewer: {
          id:              r.reviewer?.id,
          fullName:        r.reviewer?.fullName,
          profileImageUrl: r.reviewer?.profileImageUrl,
        },
      })),
      pastPhotos,
    };
  }
}
