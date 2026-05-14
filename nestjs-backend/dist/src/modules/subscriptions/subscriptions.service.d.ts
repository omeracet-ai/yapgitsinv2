import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from './subscription-plan.entity';
import { UserSubscription, SubscriptionStatus } from './user-subscription.entity';
import { IyzipayService } from '../escrow/iyzipay.service';
export declare class SubscriptionsService implements OnModuleInit {
    private plansRepo;
    private subsRepo;
    private readonly iyzipay;
    private readonly logger;
    constructor(plansRepo: Repository<SubscriptionPlan>, subsRepo: Repository<UserSubscription>, iyzipay: IyzipayService);
    onModuleInit(): Promise<void>;
    listPlans(): Promise<SubscriptionPlan[]>;
    getMySubscription(userId: string): Promise<UserSubscription | null>;
    isActiveSubscriber(userId: string): Promise<boolean>;
    getActiveByUserIds(userIds: string[]): Promise<Map<string, string>>;
    getActivePlanKey(userId: string): Promise<string | null>;
    subscribe(userId: string, planKey: string): Promise<{
        subscriptionId: string;
        paymentUrl: string;
        paymentToken: string;
        mock: boolean;
        plan: SubscriptionPlan;
    }>;
    confirmPayment(userId: string, token: string): Promise<{
        subscriptionId: string;
        status: SubscriptionStatus;
        expiresAt: Date;
    }>;
    cancel(userId: string): Promise<{
        status: SubscriptionStatus;
        expiresAt: Date;
    }>;
}
