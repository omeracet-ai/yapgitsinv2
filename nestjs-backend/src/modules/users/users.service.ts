import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

export type StatField =
  | 'asCustomerTotal'
  | 'asCustomerSuccess'
  | 'asCustomerFail'
  | 'asWorkerTotal'
  | 'asWorkerSuccess'
  | 'asWorkerFail';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findByPhone(phoneNumber: string): Promise<User | null> {
    return this.repo.findOne({ where: { phoneNumber } });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  findAll(): Promise<User[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findWorkers(category?: string, city?: string): Promise<User[]> {
    const qb = this.repo
      .createQueryBuilder('u')
      .where('u.isAvailable = :available', { available: true })
      .andWhere("u.workerCategories IS NOT NULL AND u.workerCategories != '[]'");

    if (category) {
      qb.andWhere('u.workerCategories LIKE :category', {
        category: `%"${category}"%`,
      });
    }
    if (city) {
      qb.andWhere('LOWER(u.city) LIKE :city', {
        city: `%${city.toLowerCase()}%`,
      });
    }

    return qb.orderBy('u.reputationScore', 'DESC').getMany();
  }

  create(userData: Partial<User>): Promise<User> {
    return this.repo.save(this.repo.create(userData));
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id } });
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async bumpStat(userId: string, field: StatField): Promise<void> {
    await this.repo.increment({ id: userId }, field, 1);
  }

  /** Review eklendikten sonra averageRating, totalReviews ve reputationScore'u güncelle */
  async recalcRating(userId: string, newRating: number): Promise<void> {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) return;
    const total = user.totalReviews + 1;
    const average =
      (user.averageRating * user.totalReviews + newRating) / total;
    // reputationScore: puan ortalaması × 20 + başarılı iş sayısı × 5
    const reputation =
      Math.round(average * 20) +
      (user.asCustomerSuccess + user.asWorkerSuccess) * 5;
    await this.repo.update(userId, {
      totalReviews: total,
      averageRating: Math.round(average * 100) / 100,
      reputationScore: reputation,
    });
  }

  /** Stats güncellendikten sonra reputationScore'u yeniden hesapla */
  async recalcReputation(userId: string): Promise<void> {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) return;
    const reputation =
      Math.round(user.averageRating * 20) +
      (user.asCustomerSuccess + user.asWorkerSuccess) * 5;
    await this.repo.update(userId, { reputationScore: reputation });
  }
}
