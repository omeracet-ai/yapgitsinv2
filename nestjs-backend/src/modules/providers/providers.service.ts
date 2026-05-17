import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from "typeorm";
import { Provider } from './provider.entity';
import { User } from '../users/user.entity';
import { Job, JobStatus } from '../jobs/job.entity';
import { Offer, OfferStatus } from '../jobs/offer.entity';
import { computeBadges } from '../users/badges.util';
import {
  AdminListQueryDto,
  buildPaginated,
  normalizePaging,
  PaginatedResult,
} from '../admin/dto/admin-list-query.dto';
import { bayesianAvg } from '../../common/utils/rating';

/**
 * Airtasker-style "tasker" model: a tasker IS a user with workerCategories set.
 * Provider entity is preserved for backward compat (entries auto-created on demand
 * via getOrCreateForUser). Admin endpoints surface every worker, not just rows
 * that happen to exist in the providers table.
 */
@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider) private repo: Repository<Provider>,
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Job) private jobsRepo: Repository<Job>,
    @InjectRepository(Offer) private offersRepo: Repository<Offer>,
  ) {}

  // ──────────────────────────────────────────────────────────────────────
  // Phase 254-Voldi-providers — public API used by the Flutter app.
  // Admin endpoints (findAll/findAllPaged/setVerified/setFeaturedOrder)
  // stay untouched; everything below shapes the same row for the app.
  // ──────────────────────────────────────────────────────────────────────

  private toPublicDto(provider: Provider, u: User) {
    return {
      id: provider.id,
      userId: u.id,
      businessName: provider.businessName || u.fullName,
      bio: provider.bio || u.workerBio || null,
      isVerified: provider.isVerified || u.identityVerified === true,
      featuredOrder: provider.featuredOrder,
      documents: provider.documents,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
      averageRating: this.calcBayesianRating(u),
      totalReviews: u.totalReviews ?? 0,
      identityVerified: u.identityVerified === true,
      reputationScore: u.reputationScore ?? 0,
      workerCategories: u.workerCategories ?? [],
      workerSkills: u.workerSkills ?? [],
      asWorkerSuccess: u.asWorkerSuccess ?? 0,
      asWorkerTotal: u.asWorkerTotal ?? 0,
      hourlyRateMinMinor: u.hourlyRateMinMinor ?? null,
      hourlyRateMaxMinor: u.hourlyRateMaxMinor ?? null,
      city: u.city ?? null,
      latitude: u.latitude ?? null,
      longitude: u.longitude ?? null,
      profileImageUrl: u.profileImageUrl ?? null,
      fullName: u.fullName,
      badges: computeBadges(u),
      user: {
        id: u.id,
        fullName: u.fullName,
        profileImageUrl: u.profileImageUrl,
        city: u.city,
      },
    };
  }

  /** Public list — best-effort filtering; full advanced search lives on /users/workers. */
  async findPublic(opts: {
    search?: string;
    minRating?: number;
    minRate?: number;
    maxRate?: number;
    verifiedOnly?: boolean;
    availableOnly?: boolean;
    sortBy?: string;
    lat?: number;
    lng?: number;
    radiusKm?: number;
  }) {
    const qb = this.usersRepo
      .createQueryBuilder('u')
      .where('u.workerCategories IS NOT NULL')
      .andWhere("u.workerCategories != '[]'")
      .andWhere("u.workerCategories != ''");

    if (opts.verifiedOnly) qb.andWhere('u.identityVerified = :v', { v: true });
    if (opts.minRating != null) qb.andWhere('u.averageRating >= :mr', { mr: opts.minRating });
    if (opts.availableOnly) qb.andWhere('u.isAvailable = :a', { a: true });
    if (opts.search) {
      qb.andWhere(
        new Brackets((b) => {
          b.where('LOWER(u.fullName) LIKE LOWER(:s)', { s: `%${opts.search}%` })
            .orWhere('LOWER(u.workerBio) LIKE LOWER(:s)', { s: `%${opts.search}%` });
        }),
      );
    }

    switch (opts.sortBy) {
      case 'rating':
        qb.orderBy('u.averageRating', 'DESC');
        break;
      case 'rate_asc':
        qb.orderBy('u.hourlyRateMinMinor', 'ASC');
        break;
      case 'rate_desc':
        qb.orderBy('u.hourlyRateMinMinor', 'DESC');
        break;
      default:
        qb.orderBy('u.reputationScore', 'DESC');
    }
    qb.take(200);

    const workers = await qb.getMany();
    return Promise.all(
      workers.map(async (u) => this.toPublicDto(await this.getOrCreateForUser(u), u)),
    );
  }

  async findOnePublic(id: string) {
    const provider = await this.repo.findOne({ where: { id } });
    if (!provider) return null;
    const u = await this.usersRepo.findOne({ where: { id: provider.userId } });
    if (!u) return null;
    return this.toPublicDto(provider, u);
  }

  async findByUserIdPublic(userId: string) {
    const u = await this.usersRepo.findOne({ where: { id: userId } });
    if (!u) return null;
    const provider = await this.getOrCreateForUser(u);
    return this.toPublicDto(provider, u);
  }

  /** Upsert: create-or-update the provider row owned by `userId`. */
  async upsertForUser(
    userId: string,
    data: { businessName: string; bio?: string; documents?: Record<string, string> },
  ) {
    const u = await this.usersRepo.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException('Kullanıcı bulunamadı');
    let p = await this.repo.findOne({ where: { userId } });
    if (!p) {
      p = this.repo.create({
        userId,
        businessName: data.businessName,
        bio: data.bio ?? null,
        documents: data.documents ?? null,
        averageRating: u.averageRating ?? 0,
        totalReviews: u.totalReviews ?? 0,
        isVerified: u.identityVerified === true,
      } as Partial<Provider>);
    } else {
      p.businessName = data.businessName;
      if (data.bio !== undefined) p.bio = data.bio;
      if (data.documents !== undefined) p.documents = data.documents;
    }
    p = await this.repo.save(p);
    return this.toPublicDto(p, u);
  }

  async assertOwner(providerId: string, userId: string): Promise<boolean> {
    const p = await this.repo.findOne({ where: { id: providerId } });
    return !!p && p.userId === userId;
  }

  async updateOwned(
    providerId: string,
    patch: { businessName?: string; bio?: string; documents?: Record<string, string> },
  ) {
    const update: Partial<Provider> = {};
    if (patch.businessName !== undefined) update.businessName = patch.businessName;
    if (patch.bio !== undefined) update.bio = patch.bio;
    if (patch.documents !== undefined) update.documents = patch.documents;
    if (Object.keys(update).length > 0) {
      await this.repo.update(providerId, update);
    }
    const dto = await this.findOnePublic(providerId);
    if (!dto) throw new NotFoundException('Sağlayıcı bulunamadı');
    return dto;
  }

  /**
   * Completed jobs for a provider's gallery.
   * Joins: provider → userId, accepted Offers by that user, parent Jobs in COMPLETED.
   * Returns the minimal shape the Flutter profile screen reads:
   * { id, title, category, photos[], completedAt }
   */
  async getCompletedJobsForProvider(providerId: string) {
    const provider = await this.repo.findOne({ where: { id: providerId } });
    if (!provider) return [];
    const acceptedOffers = await this.offersRepo.find({
      where: { userId: provider.userId, status: OfferStatus.ACCEPTED },
      select: ['jobId'] as (keyof Offer)[],
    });
    const jobIds = acceptedOffers.map((o) => o.jobId);
    if (jobIds.length === 0) return [];
    const jobs = await this.jobsRepo.find({
      where: { id: In(jobIds), status: JobStatus.COMPLETED },
      order: { updatedAt: 'DESC' },
      take: 50,
    });
    return jobs.map((j) => ({
      id: j.id,
      title: j.title,
      category: j.category,
      photos: [
        ...(j.completionPhotos ?? []),
        ...(j.endJobPhotos ?? []),
        ...(j.photos ?? []),
      ].slice(0, 6),
      completedAt: j.updatedAt,
    }));
  }

  /**
   * Admin list — every user with workerCategories, joined with their Provider row
   * (creating one if missing) so admin can verify / feature any tasker.
   */
  async findAll() {
    const workers = await this.usersRepo
      .createQueryBuilder('u')
      .where('u.workerCategories IS NOT NULL')
      .andWhere("u.workerCategories != '[]'")
      .andWhere("u.workerCategories != ''")
      .orderBy('u.reputationScore', 'DESC')
      .getMany();

    return Promise.all(
      workers.map(async (u) => {
        const provider = await this.getOrCreateForUser(u);
        return {
          // Provider row fields
          id: provider.id,
          userId: u.id,
          businessName: provider.businessName || u.fullName,
          bio: provider.bio || u.workerBio || null,
          isVerified: provider.isVerified,
          featuredOrder: provider.featuredOrder,
          documents: provider.documents,
          createdAt: provider.createdAt,
          updatedAt: provider.updatedAt,
          // User-driven fields
          averageRating: this.calcBayesianRating(u),
          totalReviews: u.totalReviews ?? 0,
          identityVerified: u.identityVerified,
          reputationScore: u.reputationScore ?? 0,
          workerCategories: u.workerCategories ?? [],
          workerSkills: u.workerSkills ?? [],
          asWorkerSuccess: u.asWorkerSuccess ?? 0,
          asWorkerTotal: u.asWorkerTotal ?? 0,
          // Airtasker-style rozetler (manuel + computed)
          badges: computeBadges(u),
          // Surface user info for admin display
          user: {
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            phoneNumber: u.phoneNumber,
            profileImageUrl: u.profileImageUrl,
            city: u.city,
          },
        };
      }),
    );
  }

  /**
   * P191/4 — Paginated provider listing. Same shape per item as findAll() but
   * server-side paged + searchable (businessName / fullName / email) + status
   * (`verified` | `unverified`).
   */
  async findAllPaged(
    q: AdminListQueryDto,
  ): Promise<PaginatedResult<Awaited<ReturnType<ProvidersService['findAll']>>[number]>> {
    const { page, limit, skip, take } = normalizePaging(q);
    const search = q.search?.trim();
    const status = q.status?.trim();

    const qb = this.usersRepo
      .createQueryBuilder('u')
      .where('u.workerCategories IS NOT NULL')
      .andWhere("u.workerCategories != '[]'")
      .andWhere("u.workerCategories != ''");

    if (status === 'verified') qb.andWhere('u.identityVerified = :v', { v: true });
    else if (status === 'unverified') qb.andWhere('u.identityVerified = :v', { v: false });

    if (search) {
      qb.andWhere(
        new Brackets((b) => {
          b.where('LOWER(u.fullName) LIKE LOWER(:s)', { s: `%${search}%` })
            .orWhere('LOWER(u.email) LIKE LOWER(:s)', { s: `%${search}%` })
            .orWhere('LOWER(u.phoneNumber) LIKE LOWER(:s)', { s: `%${search}%` });
        }),
      );
    }

    qb.orderBy('u.reputationScore', 'DESC').skip(skip).take(take);

    const [workers, total] = await qb.getManyAndCount();

    const items = await Promise.all(
      workers.map(async (u) => {
        const provider = await this.getOrCreateForUser(u);
        return {
          id: provider.id,
          userId: u.id,
          businessName: provider.businessName || u.fullName,
          bio: provider.bio || u.workerBio || null,
          isVerified: provider.isVerified,
          featuredOrder: provider.featuredOrder,
          documents: provider.documents,
          createdAt: provider.createdAt,
          updatedAt: provider.updatedAt,
          averageRating: this.calcBayesianRating(u),
          totalReviews: u.totalReviews ?? 0,
          identityVerified: u.identityVerified,
          reputationScore: u.reputationScore ?? 0,
          workerCategories: u.workerCategories ?? [],
          workerSkills: u.workerSkills ?? [],
          asWorkerSuccess: u.asWorkerSuccess ?? 0,
          asWorkerTotal: u.asWorkerTotal ?? 0,
          badges: computeBadges(u),
          user: {
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            phoneNumber: u.phoneNumber,
            profileImageUrl: u.profileImageUrl,
            city: u.city,
          },
        };
      }),
    );

    return buildPaginated(items, total, page, limit);
  }

  /** Bayesian-adjusted rating from raw average + count stored on User entity. */
  private calcBayesianRating(user: User): number {
    const avg = user.averageRating ?? 0;
    const count = user.totalReviews ?? 0;
    if (count === 0) return 0;
    // Reconstruct sum-equivalent ratings array for bayesianAvg
    const ratings = Array<number>(count).fill(avg);
    return bayesianAvg(ratings, 4.0, 10);
  }

  /** Auto-create a provider row for a user if one doesn't exist yet. */
  private async getOrCreateForUser(user: User): Promise<Provider> {
    let p = await this.repo.findOne({ where: { userId: user.id } });
    if (!p) {
      p = this.repo.create({
        userId: user.id,
        businessName: user.fullName,
        bio: user.workerBio ?? undefined,
        averageRating: user.averageRating ?? 0,
        totalReviews: user.totalReviews ?? 0,
        isVerified: user.identityVerified,
      } as Partial<Provider>);
      p = await this.repo.save(p);
    }
    return p;
  }

  async setVerified(id: string, isVerified: boolean): Promise<Provider> {
    const provider = await this.repo.findOne({ where: { id } });
    if (!provider) throw new NotFoundException('Sağlayıcı bulunamadı');
    await this.repo.update(id, { isVerified });
    // Mirror to user.identityVerified — single source of truth for "blue tick"
    await this.usersRepo.update(provider.userId, { identityVerified: isVerified });
    return { ...provider, isVerified };
  }

  async setFeaturedOrder(id: string, featuredOrder: number | null): Promise<Provider> {
    const provider = await this.repo.findOne({ where: { id } });
    if (!provider) throw new NotFoundException('Sağlayıcı bulunamadı');
    await this.repo.update(id, { featuredOrder });
    return { ...provider, featuredOrder };
  }
}
