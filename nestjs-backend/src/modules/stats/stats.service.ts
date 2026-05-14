import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStatus } from '../jobs/job.entity';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';

export interface PublicStats {
  totalJobs: number;
  totalWorkers: number;
  completedJobs: number;
  totalCategories: number;
}

interface CacheEntry {
  data: PublicStats;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1_000; // 5 dakika

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async getPublicStats(): Promise<PublicStats> {
    const cached = this.cache.get('public');
    if (cached && Date.now() < cached.expiresAt) {
      this.logger.debug('stats cache hit');
      return cached.data;
    }

    this.logger.debug('stats cache miss — querying DB');

    const [totalJobs, completedJobs, totalCategories, totalWorkers] =
      await Promise.all([
        this.jobRepo.count(),
        this.jobRepo.count({ where: { status: JobStatus.COMPLETED } }),
        this.categoryRepo.count(),
        // Workers = users with workerCategories IS NOT NULL and not empty array
        this.userRepo
          .createQueryBuilder('u')
          .where("u.workerCategories IS NOT NULL AND u.workerCategories != '[]'")
          .getCount(),
      ]);

    const data: PublicStats = {
      totalJobs,
      totalWorkers,
      completedJobs,
      totalCategories,
    };

    this.cache.set('public', { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  }
}
