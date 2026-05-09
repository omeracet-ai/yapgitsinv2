import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In } from 'typeorm';
import {
  SubscriptionPlan,
  SubscriptionPeriod,
} from './subscription-plan.entity';
import {
  UserSubscription,
  SubscriptionStatus,
} from './user-subscription.entity';

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(SubscriptionPlan)
    private plansRepo: Repository<SubscriptionPlan>,
    @InjectRepository(UserSubscription)
    private subsRepo: Repository<UserSubscription>,
  ) {}

  async onModuleInit() {
    const count = await this.plansRepo.count();
    if (count > 0) return;
    const plans: Partial<SubscriptionPlan>[] = [
      {
        key: 'pro_monthly',
        name: 'Pro Aylık',
        price: 99,
        period: SubscriptionPeriod.MONTHLY,
        features: [
          'Sınırsız teklif (token tüketmez)',
          'Öncelikli listeleme',
          'Pro rozet',
          'Detaylı istatistikler',
        ],
        isActive: true,
        sortOrder: 1,
      },
      {
        key: 'premium_monthly',
        name: 'Premium Aylık',
        price: 299,
        period: SubscriptionPeriod.MONTHLY,
        features: [
          'Pro tüm özellikler',
          'Featured slot 24/7',
          'AI önerileri öncelik',
          'Premium rozet',
          'Özel destek',
        ],
        isActive: true,
        sortOrder: 2,
      },
    ];
    for (const p of plans) {
      await this.plansRepo.save(this.plansRepo.create(p));
    }
    this.logger.log('Seeded 2 subscription plans (Pro/Premium)');
  }

  async listPlans(): Promise<SubscriptionPlan[]> {
    return this.plansRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async getMySubscription(userId: string): Promise<UserSubscription | null> {
    return this.subsRepo.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['plan'],
      order: { expiresAt: 'DESC' },
    });
  }

  /**
   * Phase 110 — Aktif abone mi? (Pro/Premium → token kesimini SKIP).
   */
  async isActiveSubscriber(userId: string): Promise<boolean> {
    const sub = await this.getMySubscription(userId);
    return !!sub;
  }

  /**
   * Phase 146 — Bulk active subscription fetch (badge enrichment için).
   * Returns Map<userId, planKey> for active subscribers only.
   */
  async getActiveByUserIds(userIds: string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    if (!userIds || userIds.length === 0) return out;
    const subs = await this.subsRepo.find({
      where: {
        userId: In(userIds),
        status: SubscriptionStatus.ACTIVE,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['plan'],
    });
    for (const s of subs) {
      if (s.plan?.key) out.set(s.userId, s.plan.key);
    }
    return out;
  }

  /** Phase 146 — Get active plan key for a single user (or null). */
  async getActivePlanKey(userId: string): Promise<string | null> {
    const sub = await this.getMySubscription(userId);
    return sub?.plan?.key ?? null;
  }

  /**
   * Abonelik başlat. Şu an: pending_payment kaydı oluşturup payment URL döner.
   * Gerçek iyzipay başarı callback'i sonrası status=active olacak (placeholder).
   */
  async subscribe(
    userId: string,
    planKey: string,
  ): Promise<{ subscriptionId: string; paymentUrl: string; plan: SubscriptionPlan }> {
    const plan = await this.plansRepo.findOne({ where: { key: planKey, isActive: true } });
    if (!plan) throw new NotFoundException(`Plan bulunamadı: ${planKey}`);

    const existing = await this.getMySubscription(userId);
    if (existing) {
      throw new BadRequestException('Zaten aktif bir aboneliğiniz var');
    }

    const now = new Date();
    const expires = new Date(now);
    if (plan.period === SubscriptionPeriod.YEARLY) {
      expires.setFullYear(expires.getFullYear() + 1);
    } else {
      expires.setMonth(expires.getMonth() + 1);
    }

    const sub = this.subsRepo.create({
      userId,
      planId: plan.id,
      status: SubscriptionStatus.ACTIVE, // sandbox: instant activation
      startedAt: now,
      expiresAt: expires,
      paymentRef: null,
    });
    await this.subsRepo.save(sub);

    // iyzipay placeholder URL — production'da PaymentsService.createCheckoutForm reuse edilir
    const paymentUrl = `/iyzipay/subscribe?ref=${sub.id}&plan=${plan.key}`;
    return { subscriptionId: sub.id, paymentUrl, plan };
  }

  async cancel(
    userId: string,
  ): Promise<{ status: SubscriptionStatus; expiresAt: Date }> {
    const sub = await this.getMySubscription(userId);
    if (!sub) throw new NotFoundException('Aktif abonelik bulunamadı');
    sub.status = SubscriptionStatus.CANCELLED;
    sub.cancelledAt = new Date();
    await this.subsRepo.save(sub);
    return { status: sub.status, expiresAt: sub.expiresAt };
  }
}
