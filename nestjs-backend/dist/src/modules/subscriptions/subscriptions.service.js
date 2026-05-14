"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SubscriptionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const subscription_plan_entity_1 = require("./subscription-plan.entity");
const user_subscription_entity_1 = require("./user-subscription.entity");
const iyzipay_service_1 = require("../escrow/iyzipay.service");
let SubscriptionsService = SubscriptionsService_1 = class SubscriptionsService {
    plansRepo;
    subsRepo;
    iyzipay;
    logger = new common_1.Logger(SubscriptionsService_1.name);
    constructor(plansRepo, subsRepo, iyzipay) {
        this.plansRepo = plansRepo;
        this.subsRepo = subsRepo;
        this.iyzipay = iyzipay;
    }
    async onModuleInit() {
        const count = await this.plansRepo.count();
        if (count > 0)
            return;
        const plans = [
            {
                key: 'pro_monthly',
                name: 'Pro Aylık',
                price: 99,
                period: subscription_plan_entity_1.SubscriptionPeriod.MONTHLY,
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
                period: subscription_plan_entity_1.SubscriptionPeriod.MONTHLY,
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
    async listPlans() {
        return this.plansRepo.find({
            where: { isActive: true },
            order: { sortOrder: 'ASC' },
        });
    }
    async getMySubscription(userId) {
        return this.subsRepo.findOne({
            where: {
                userId,
                status: user_subscription_entity_1.SubscriptionStatus.ACTIVE,
                expiresAt: (0, typeorm_2.MoreThan)(new Date()),
            },
            relations: ['plan'],
            order: { expiresAt: 'DESC' },
        });
    }
    async isActiveSubscriber(userId) {
        const sub = await this.getMySubscription(userId);
        return !!sub;
    }
    async getActiveByUserIds(userIds) {
        const out = new Map();
        if (!userIds || userIds.length === 0)
            return out;
        const subs = await this.subsRepo.find({
            where: {
                userId: (0, typeorm_2.In)(userIds),
                status: user_subscription_entity_1.SubscriptionStatus.ACTIVE,
                expiresAt: (0, typeorm_2.MoreThan)(new Date()),
            },
            relations: ['plan'],
        });
        for (const s of subs) {
            if (s.plan?.key)
                out.set(s.userId, s.plan.key);
        }
        return out;
    }
    async getActivePlanKey(userId) {
        const sub = await this.getMySubscription(userId);
        return sub?.plan?.key ?? null;
    }
    async subscribe(userId, planKey) {
        const plan = await this.plansRepo.findOne({ where: { key: planKey, isActive: true } });
        if (!plan)
            throw new common_1.NotFoundException(`Plan bulunamadı: ${planKey}`);
        const existing = await this.getMySubscription(userId);
        if (existing) {
            throw new common_1.BadRequestException('Zaten aktif bir aboneliğiniz var');
        }
        const now = new Date();
        const expires = new Date(now);
        if (plan.period === subscription_plan_entity_1.SubscriptionPeriod.YEARLY) {
            expires.setFullYear(expires.getFullYear() + 1);
        }
        else {
            expires.setMonth(expires.getMonth() + 1);
        }
        const sub = this.subsRepo.create({
            userId,
            planId: plan.id,
            status: user_subscription_entity_1.SubscriptionStatus.PENDING_PAYMENT,
            startedAt: now,
            expiresAt: expires,
            paymentRef: null,
        });
        await this.subsRepo.save(sub);
        const checkout = await this.iyzipay.createCheckoutForm({
            refId: sub.id,
            gross: Number(plan.price),
            callbackUrl: iyzipay_service_1.IyzipayService.callbackUrl(),
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
    async confirmPayment(userId, token) {
        if (!token)
            throw new common_1.BadRequestException('token zorunlu');
        const sub = await this.subsRepo.findOne({
            where: { userId, paymentRef: token },
            relations: ['plan'],
        });
        if (!sub)
            throw new common_1.NotFoundException('Abonelik kaydı bulunamadı');
        if (sub.status === user_subscription_entity_1.SubscriptionStatus.ACTIVE) {
            return { subscriptionId: sub.id, status: sub.status, expiresAt: sub.expiresAt };
        }
        const verify = await this.iyzipay.retrieveCheckout(token);
        if (verify.status !== 'SUCCESS') {
            sub.status = user_subscription_entity_1.SubscriptionStatus.EXPIRED;
            await this.subsRepo.save(sub);
            throw new common_1.BadRequestException('Ödeme doğrulanamadı');
        }
        sub.status = user_subscription_entity_1.SubscriptionStatus.ACTIVE;
        sub.startedAt = new Date();
        const expires = new Date(sub.startedAt);
        if (sub.plan?.period === subscription_plan_entity_1.SubscriptionPeriod.YEARLY) {
            expires.setFullYear(expires.getFullYear() + 1);
        }
        else {
            expires.setMonth(expires.getMonth() + 1);
        }
        sub.expiresAt = expires;
        await this.subsRepo.save(sub);
        this.logger.log(`Subscription ${sub.id} ACTIVE (user=${userId}, paymentId=${verify.paymentId})`);
        return { subscriptionId: sub.id, status: sub.status, expiresAt: sub.expiresAt };
    }
    async cancel(userId) {
        const sub = await this.getMySubscription(userId);
        if (!sub)
            throw new common_1.NotFoundException('Aktif abonelik bulunamadı');
        sub.status = user_subscription_entity_1.SubscriptionStatus.CANCELLED;
        sub.cancelledAt = new Date();
        await this.subsRepo.save(sub);
        return { status: sub.status, expiresAt: sub.expiresAt };
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = SubscriptionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(subscription_plan_entity_1.SubscriptionPlan)),
    __param(1, (0, typeorm_1.InjectRepository)(user_subscription_entity_1.UserSubscription)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        iyzipay_service_1.IyzipayService])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map