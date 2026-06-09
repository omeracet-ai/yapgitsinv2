import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltyTransaction } from '../entities/loyalty-transaction.entity';
import { User } from '../../users/user.entity';

export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

const TIER_THRESHOLDS: Array<{ tier: LoyaltyTier; min: number }> = [
  { tier: 'Bronze', min: 0 },
  { tier: 'Silver', min: 5 },
  { tier: 'Gold', min: 15 },
  { tier: 'Platinum', min: 30 },
];

function tierOf(success: number): LoyaltyTier {
  let current: LoyaltyTier = 'Bronze';
  for (const t of TIER_THRESHOLDS) {
    if (success >= t.min) current = t.tier;
  }
  return current;
}

@Injectable()
export class LoyaltyAdminService {
  constructor(
    @InjectRepository(LoyaltyTransaction)
    private readonly txs: Repository<LoyaltyTransaction>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async leaderboard(limit = 50) {
    const users = await this.users
      .createQueryBuilder('u')
      .select([
        'u.id AS id',
        'u.fullName AS fullName',
        'u.email AS email',
        'u.asCustomerSuccess AS asCustomerSuccess',
        'u.asWorkerSuccess AS asWorkerSuccess',
        'u.tokenBalance AS tokenBalance',
        'u.profileImageUrl AS profileImageUrl',
      ])
      .orderBy(
        '(COALESCE(u.asCustomerSuccess,0) + COALESCE(u.asWorkerSuccess,0))',
        'DESC',
      )
      .limit(limit)
      .getRawMany();

    return users.map((u) => {
      const success =
        Number(u.asCustomerSuccess ?? 0) + Number(u.asWorkerSuccess ?? 0);
      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        profileImageUrl: u.profileImageUrl,
        tokenBalance: Number(u.tokenBalance ?? 0),
        totalSuccess: success,
        tier: tierOf(success),
      };
    });
  }

  async tierStats(): Promise<{ tier: LoyaltyTier; count: number }[]> {
    const users = await this.users
      .createQueryBuilder('u')
      .select([
        'COALESCE(u.asCustomerSuccess,0) + COALESCE(u.asWorkerSuccess,0) AS success',
      ])
      .getRawMany<{ success: number }>();
    const buckets: Record<LoyaltyTier, number> = {
      Bronze: 0,
      Silver: 0,
      Gold: 0,
      Platinum: 0,
    };
    users.forEach((u) => {
      buckets[tierOf(Number(u.success ?? 0))] += 1;
    });
    return (Object.keys(buckets) as LoyaltyTier[]).map((t) => ({
      tier: t,
      count: buckets[t],
    }));
  }

  async grant(
    userId: string,
    points: number,
    reason?: string,
    adminId?: string,
  ): Promise<LoyaltyTransaction> {
    const tx = this.txs.create({
      userId,
      type: 'bonus',
      points,
      reason: reason ?? null,
      meta: adminId ? { adminId } : null,
    });
    return this.txs.save(tx);
  }

  async listTransactions(userId?: string, limit = 50) {
    const qb = this.txs
      .createQueryBuilder('t')
      .orderBy('t.createdAt', 'DESC')
      .limit(limit);
    if (userId) qb.where('t.userId = :userId', { userId });
    return qb.getMany();
  }
}
