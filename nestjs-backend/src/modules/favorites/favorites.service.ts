import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoriteProvider } from './favorite-provider.entity';
import {
  SavedJobSearch,
  SavedJobSearchCriteria,
} from './saved-job-search.entity';
import { User } from '../users/user.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(FavoriteProvider)
    private readonly favRepo: Repository<FavoriteProvider>,
    @InjectRepository(SavedJobSearch)
    private readonly searchRepo: Repository<SavedJobSearch>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ---- Favorited providers ----

  async listFavoriteProviders(userId: string): Promise<
    Array<{
      id: string;
      providerId: string;
      notes: string | null;
      createdAt: Date;
      provider: {
        id: string;
        fullName: string;
        profileImageUrl: string | null;
        averageRating: number;
        totalReviews: number;
        identityVerified: boolean;
        workerCategories: string[] | null;
      } | null;
    }>
  > {
    const favs = await this.favRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    if (favs.length === 0) return [];

    const providerIds = favs.map((f) => f.providerId);
    const providers = await this.userRepo
      .createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids: providerIds })
      .getMany();
    const byId = new Map(providers.map((p) => [p.id, p]));

    return favs.map((f) => {
      const p = byId.get(f.providerId);
      return {
        id: f.id,
        providerId: f.providerId,
        notes: f.notes,
        createdAt: f.createdAt,
        provider: p
          ? {
              id: p.id,
              fullName: p.fullName,
              profileImageUrl: p.profileImageUrl ?? null,
              averageRating: p.averageRating ?? 0,
              totalReviews: p.totalReviews ?? 0,
              identityVerified: p.identityVerified ?? false,
              workerCategories: p.workerCategories ?? null,
            }
          : null,
      };
    });
  }

  async addFavoriteProvider(
    userId: string,
    providerId: string,
    notes?: string | null,
  ): Promise<FavoriteProvider> {
    if (!providerId) {
      throw new BadRequestException('providerId required');
    }
    if (providerId === userId) {
      throw new BadRequestException('Cannot favorite yourself');
    }
    const provider = await this.userRepo.findOne({ where: { id: providerId } });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const existing = await this.favRepo.findOne({
      where: { userId, providerId },
    });
    if (existing) {
      // Idempotent — optionally update notes if provided
      if (notes !== undefined) {
        existing.notes = notes ?? null;
        return this.favRepo.save(existing);
      }
      return existing;
    }

    const fav = this.favRepo.create({
      userId,
      providerId,
      notes: notes ?? null,
    });
    return this.favRepo.save(fav);
  }

  async removeFavoriteProvider(
    userId: string,
    providerId: string,
  ): Promise<{ removed: boolean }> {
    const result = await this.favRepo.delete({ userId, providerId });
    return { removed: (result.affected ?? 0) > 0 };
  }

  // ---- Saved job searches ----

  async listSavedSearches(userId: string): Promise<SavedJobSearch[]> {
    return this.searchRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async createSavedSearch(
    userId: string,
    name: string,
    criteria: SavedJobSearchCriteria,
    alertEnabled?: boolean,
  ): Promise<SavedJobSearch> {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('name required');
    }
    if (!criteria || typeof criteria !== 'object') {
      throw new BadRequestException('criteria required');
    }
    const entity = this.searchRepo.create({
      userId,
      name: name.trim().slice(0, 100),
      criteria,
      ...(alertEnabled !== undefined ? { alertEnabled } : {}),
    });
    return this.searchRepo.save(entity);
  }

  async updateSavedSearch(
    userId: string,
    id: string,
    patch: { name?: string; criteria?: SavedJobSearchCriteria },
  ): Promise<SavedJobSearch> {
    const entity = await this.searchRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Saved search not found');
    if (entity.userId !== userId) {
      throw new ForbiddenException('Not your saved search');
    }
    if (patch.name !== undefined) {
      const trimmed = patch.name.trim();
      if (trimmed.length === 0) {
        throw new BadRequestException('name cannot be empty');
      }
      entity.name = trimmed.slice(0, 100);
    }
    if (patch.criteria !== undefined) {
      entity.criteria = patch.criteria;
    }
    return this.searchRepo.save(entity);
  }

  async deleteSavedSearch(
    userId: string,
    id: string,
  ): Promise<{ deleted: boolean }> {
    const entity = await this.searchRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Saved search not found');
    if (entity.userId !== userId) {
      throw new ForbiddenException('Not your saved search');
    }
    await this.searchRepo.delete({ id });
    return { deleted: true };
  }
}
