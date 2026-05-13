import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from "typeorm";
import { Provider } from './provider.entity';
import { User } from '../users/user.entity';
import { computeBadges } from '../users/badges.util';
import {
  AdminListQueryDto,
  buildPaginated,
  normalizePaging,
  PaginatedResult,
} from '../admin/dto/admin-list-query.dto';

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
  ) {}

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
          averageRating: u.averageRating ?? 0,
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
          averageRating: u.averageRating ?? 0,
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
