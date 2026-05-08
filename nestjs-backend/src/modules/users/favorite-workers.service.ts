import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoriteWorker } from './favorite-worker.entity';
import { User } from './user.entity';

export interface FavoriteWorkerPublic {
  id: string;
  fullName: string;
  profileImageUrl: string | null;
  workerCategories: string[] | null;
  city: string | null;
  district: string | null;
  averageRating: number;
  totalReviews: number;
  reputationScore: number;
  identityVerified: boolean;
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  isAvailable: boolean;
  favoritedAt: Date;
}

@Injectable()
export class FavoriteWorkersService {
  constructor(
    @InjectRepository(FavoriteWorker)
    private readonly favRepo: Repository<FavoriteWorker>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async addFavorite(
    userId: string,
    workerId: string,
  ): Promise<{ favorited: true; workerId: string }> {
    if (workerId === userId) {
      throw new BadRequestException('Cannot favorite yourself');
    }
    const worker = await this.userRepo.findOne({
      where: { id: workerId },
      select: ['id'],
    });
    if (!worker) throw new NotFoundException('Worker not found');

    // Idempotent insert: ignore duplicate via unique index
    try {
      await this.favRepo.insert({ userId, workerId });
    } catch {
      // unique violation — already favorited, treat as success
    }
    return { favorited: true, workerId };
  }

  async removeFavorite(
    userId: string,
    workerId: string,
  ): Promise<{ favorited: false; workerId: string }> {
    await this.favRepo.delete({ userId, workerId });
    return { favorited: false, workerId };
  }

  async listFavorites(
    userId: string,
  ): Promise<{ data: FavoriteWorkerPublic[]; total: number }> {
    const rows = await this.favRepo
      .createQueryBuilder('f')
      .innerJoinAndSelect('f.worker', 'w')
      .where('f.userId = :userId', { userId })
      .orderBy('f.createdAt', 'DESC')
      .getMany();

    const data: FavoriteWorkerPublic[] = rows.map((f) => {
      const w = f.worker;
      return {
        id: w.id,
        fullName: w.fullName,
        profileImageUrl: w.profileImageUrl ?? null,
        workerCategories: w.workerCategories ?? null,
        city: w.city ?? null,
        district: w.district ?? null,
        averageRating: w.averageRating ?? 0,
        totalReviews: w.totalReviews ?? 0,
        reputationScore: w.reputationScore ?? 0,
        identityVerified: w.identityVerified ?? false,
        hourlyRateMin: w.hourlyRateMin ?? null,
        hourlyRateMax: w.hourlyRateMax ?? null,
        isAvailable: w.isAvailable ?? false,
        favoritedAt: f.createdAt,
      };
    });
    return { data, total: data.length };
  }
}
