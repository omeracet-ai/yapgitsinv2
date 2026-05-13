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
import { IyzipayService } from '../escrow/iyzipay.service';

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(SubscriptionPlan)
    private plansRepo: Repository<SubscriptionPlan>,
    @InjectRepository(UserSubscription)
    private subsRepo: Repository<UserSubscription>,
    private readonly iyzipay: IyzipayService,
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
   * Abonelik başlat — Phase 188.
   * pending_payment kaydı oluşturur, iyzipay Checkout Form initialize çağırır,
   * hosted payment page URL + token döner. Flutter WebView'da bu URL açılır,
   * iyzipay ödemeyi callbackUrl'a POST eder; ayrıca client confirmPayment(token)
   * ile manuel doğrulatabilir (WebView navigation interception path).
   */
  async subscribe(
    userId: string,
    planKey: string,
  ): Promise<{
    subscriptionId: string;
    paymentUrl: string;
    paymentToken: string;
    mock: boolean;
    plan: SubscriptionPlan;
  }> {
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

    // pending kayıt — confirm sonrası ACTIVE'e geçer
    const sub = this.subsRepo.create({
      userId,
      planId: plan.id,
      status: SubscriptionStatus.PENDING_PAYMENT,
      startedAt: now,
      expiresAt: expires,
      paymentRef: null,
    });
    await this.subsRepo.save(sub);

    // iyzipay Checkout Form initialize
    const checkout = await this.iyzipay.createCheckoutForm({
      refId: sub.id,
      gross: Number(plan.price),
      callbackUrl: IyzipayService.callbackUrl(),
      itemName: `${plan.name} (Abonelik)`,
    });

    sub.paymentRef = checkout.token;
    await this.subsRepo.save(sub);

    const paymentUrl = checkout.paymentPageUrl ?? '';
    return {
      subscriptionId: sub.id,
      paymentUrl,
      paymentToken: checkout.token,
      mock: checkout.mock,
      plan,
    };
  }

  /**
   * Phase 188 — iyzipay başarı doğrulama. Flutter WebView callback URL'i
   * yakalayınca veya iyzipay backend'e POST callback yapınca çağrılır.
   * Sunucu iyzipay'i retrieveCheckout ile re-verify eder, sonra
   * subscription ACTIVE olur.
   */
  async confirmPayment(
    userId: string,
    token: string,
  ): Promise<{ subscriptionId: string; status: SubscriptionStatus; expiresAt: Date }> {
    if (!token) throw new BadRequestException('token zorunlu');
    const sub = await this.subsRepo.findOne({
      where: { userId, paymentRef: token },
      relations: ['plan'],
    });
    if (!sub) throw new NotFoundException('Abonelik kaydı bulunamadı');

    if (sub.status === SubscriptionStatus.ACTIVE) {
      return { subscriptionId: sub.id, status: sub.status, expiresAt: sub.expiresAt };
    }

    const verify = await this.iyzipay.retrieveCheckout(token);
    if (verify.status !== 'SUCCESS') {
      sub.status = SubscriptionStatus.EXPIRED;
      await this.subsRepo.save(sub);
      throw new BadRequestException('Ödeme doğrulanamadı');
    }

    sub.status = SubscriptionStatus.ACTIVE;
    sub.startedAt = new Date();
    const expires = new Date(sub.startedAt);
    if (sub.plan?.period === SubscriptionPeriod.YEARLY) {
      expires.setFullYear(expires.getFullYear() + 1);
    } else {
      expires.setMonth(expires.getMonth() + 1);
    }
    sub.expiresAt = expires;
    await this.subsRepo.save(sub);

    this.logger.log(
      `Subscription ${sub.id} ACTIVE (user=${userId}, paymentId=${verify.paymentId})`,
    );
    return { subscriptionId: sub.id, status: sub.status, expiresAt: sub.expiresAt };
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
