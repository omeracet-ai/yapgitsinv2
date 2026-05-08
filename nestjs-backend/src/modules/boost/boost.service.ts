import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';
import { Boost, BoostStatus, BoostType, BOOST_PACKAGES } from './boost.entity';
import { User } from '../users/user.entity';
import {
  TokenTransaction,
  TxType,
  TxStatus,
  PaymentMethod,
} from '../tokens/token-transaction.entity';

@Injectable()
export class BoostService {
  constructor(
    @InjectRepository(Boost) private readonly boostRepo: Repository<Boost>,
    private readonly dataSource: DataSource,
  ) {}

  getPackages() {
    return BOOST_PACKAGES;
  }

  async purchase(
    userId: string,
    type: BoostType,
  ): Promise<{ boost: Boost; newTokenBalance: number }> {
    const pkg = BOOST_PACKAGES.find((p) => p.type === type);
    if (!pkg) throw new BadRequestException('Geçersiz boost tipi');

    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
      if (!user.workerCategories || user.workerCategories.length === 0) {
        throw new BadRequestException('Sadece ustalar boost satın alabilir');
      }
      if (user.tokenBalance < pkg.tokenCost) {
        throw new BadRequestException(
          `Yetersiz bakiye. Gerekli: ${pkg.tokenCost}, Mevcut: ${user.tokenBalance}`,
        );
      }

      user.tokenBalance = user.tokenBalance - pkg.tokenCost;
      await manager.save(User, user);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + pkg.durationHours * 3600 * 1000);
      const boost = await manager.save(
        Boost,
        manager.create(Boost, {
          userId,
          type,
          tokenCost: pkg.tokenCost,
          startsAt: now,
          expiresAt,
          status: BoostStatus.ACTIVE,
        }),
      );

      await manager.save(
        TokenTransaction,
        manager.create(TokenTransaction, {
          userId,
          type: TxType.SPEND,
          amount: -pkg.tokenCost,
          description: `Boost: ${pkg.name}`,
          status: TxStatus.COMPLETED,
          paymentMethod: PaymentMethod.SYSTEM,
          paymentRef: `BOOST-${type}-${boost.id}`,
        }),
      );

      return { boost, newTokenBalance: user.tokenBalance };
    });
  }

  async getMy(
    userId: string,
  ): Promise<{ active: Boost[]; history: Boost[] }> {
    const now = new Date();
    const all = await this.boostRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    const active = all.filter(
      (b) => b.status === BoostStatus.ACTIVE && b.expiresAt > now,
    );
    const history = all.filter((b) => !active.includes(b));
    return { active, history };
  }

  async expireExpired(): Promise<number> {
    const now = new Date();
    const res = await this.boostRepo.update(
      { status: BoostStatus.ACTIVE, expiresAt: LessThan(now) },
      { status: BoostStatus.EXPIRED },
    );
    return res.affected ?? 0;
  }

  /** Active boost'ları ranking için döner. workerId → set(boostType) */
  async getActiveBoostsForRanking(): Promise<Map<string, Set<BoostType>>> {
    const now = new Date();
    const rows = await this.boostRepo
      .createQueryBuilder('b')
      .where('b.status = :s', { s: BoostStatus.ACTIVE })
      .andWhere('b.expiresAt > :now', { now })
      .getMany();
    const map = new Map<string, Set<BoostType>>();
    for (const r of rows) {
      if (!map.has(r.userId)) map.set(r.userId, new Set());
      map.get(r.userId)!.add(r.type);
    }
    return map;
  }
}
