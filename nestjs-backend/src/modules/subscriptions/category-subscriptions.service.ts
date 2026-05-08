import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { CategorySubscription } from './category-subscription.entity';

/**
 * Phase 143 — Category+City subscription service.
 * Job creation hook'undan match query yapar.
 */
@Injectable()
export class CategorySubscriptionsService {
  private readonly logger = new Logger(CategorySubscriptionsService.name);

  constructor(
    @InjectRepository(CategorySubscription)
    private readonly repo: Repository<CategorySubscription>,
  ) {}

  async listMine(userId: string): Promise<CategorySubscription[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    userId: string,
    category: string,
    city?: string | null,
  ): Promise<CategorySubscription> {
    if (!category || !category.trim()) {
      throw new BadRequestException('category zorunlu');
    }
    const cat = category.trim();
    const c = city?.trim() || null;
    const existing = await this.repo.findOne({
      where: { userId, category: cat, city: c ?? IsNull() },
    });
    if (existing) {
      throw new ConflictException('Bu abonelik zaten var');
    }
    const sub = this.repo.create({
      userId,
      category: cat,
      city: c,
      alertEnabled: true,
    });
    return this.repo.save(sub);
  }

  async remove(id: string, userId: string): Promise<{ ok: true }> {
    const sub = await this.repo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException('Abonelik bulunamadı');
    if (sub.userId !== userId) {
      throw new ForbiddenException('Bu abonelik size ait değil');
    }
    await this.repo.delete(id);
    return { ok: true };
  }

  /**
   * Job için tüm match'leyen subscription'ları döner.
   * city null ise her şehirde match'ler; doluysa hem null (any-city) hem o şehir.
   */
  async findMatches(
    category: string,
    location?: string | null,
  ): Promise<CategorySubscription[]> {
    if (!category) return [];
    const subs = await this.repo
      .createQueryBuilder('s')
      .where('s.alertEnabled = :en', { en: true })
      .andWhere('LOWER(s.category) = LOWER(:cat)', { cat: category })
      .getMany();
    if (!location) return subs;
    const loc = location.toLowerCase();
    return subs.filter((s) => {
      if (!s.city) return true; // any-city
      return loc.includes(s.city.toLowerCase());
    });
  }

  async markNotified(id: string): Promise<void> {
    await this.repo.update(id, { lastNotifiedAt: new Date() });
  }
}
