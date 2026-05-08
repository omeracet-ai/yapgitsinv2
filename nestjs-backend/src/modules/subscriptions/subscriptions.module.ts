import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlan } from './subscription-plan.entity';
import { UserSubscription } from './user-subscription.entity';
import { CategorySubscription } from './category-subscription.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { CategorySubscriptionsService } from './category-subscriptions.service';
import { CategorySubscriptionsController } from './category-subscriptions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionPlan,
      UserSubscription,
      CategorySubscription,
    ]),
  ],
  providers: [SubscriptionsService, CategorySubscriptionsService],
  controllers: [SubscriptionsController, CategorySubscriptionsController],
  exports: [SubscriptionsService, CategorySubscriptionsService],
})
export class SubscriptionsModule {}
