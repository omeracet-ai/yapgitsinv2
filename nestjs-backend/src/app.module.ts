import { Module } from '@nestjs/common';
import { ModerationModule } from './modules/moderation/moderation.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { CronModule } from './modules/cron/cron.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ChatModule } from './modules/chat/chat.module';
import { User } from './modules/users/user.entity';
import { Job } from './modules/jobs/job.entity';
import { Offer } from './modules/jobs/offer.entity';
import { PaymentsModule } from './modules/payments/payments.module';
import { Review } from './modules/reviews/review.entity';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AiModule } from './modules/ai/ai.module';
import { Category } from './modules/categories/category.entity';
import { CategoriesModule } from './modules/categories/categories.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { TokensModule } from './modules/tokens/tokens.module';
import { TokenTransaction } from './modules/tokens/token-transaction.entity';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ServiceRequest } from './modules/service-requests/service-request.entity';
import { ServiceRequestApplication } from './modules/service-requests/service-request-application.entity';
import { ServiceRequestsModule } from './modules/service-requests/service-requests.module';
import { Booking } from './modules/bookings/booking.entity';
import { BookingsModule } from './modules/bookings/bookings.module';
import { Notification } from './modules/notifications/notification.entity';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { Provider } from './modules/providers/provider.entity';
import { ChatMessage } from './modules/chat/chat-message.entity';
import { JobQuestion } from './modules/jobs/job-question.entity';
import { JobQuestionReply } from './modules/jobs/job-question-reply.entity';
import { SavedJob } from './modules/jobs/saved-job.entity';
import { OnboardingSlide } from './modules/onboarding/onboarding-slide.entity';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { FavoriteProvider } from './modules/favorites/favorite-provider.entity';
import { FavoriteWorker } from './modules/users/favorite-worker.entity';
import { SavedJobSearch } from './modules/favorites/saved-job-search.entity';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { PaymentEscrow } from './modules/escrow/payment-escrow.entity';
import { BookingEscrow } from './modules/escrow/booking-escrow.entity';
import { EscrowModule } from './modules/escrow/escrow.module';
import { CancellationPolicy } from './modules/cancellation/cancellation-policy.entity';
import { CancellationModule } from './modules/cancellation/cancellation.module';
import { JobDispute } from './modules/disputes/job-dispute.entity';
import { Dispute } from './modules/disputes/dispute.entity';
import { DisputesModule } from './modules/disputes/disputes.module';
import { AvailabilitySlot } from './modules/availability/availability-slot.entity';
import { AvailabilityBlackout } from './modules/availability/availability-blackout.entity';
import { AvailabilityModule } from './modules/availability/availability.module';
import { PromoCode } from './modules/promo/promo-code.entity';
import { PromoRedemption } from './modules/promo/promo-redemption.entity';
import { PromoModule } from './modules/promo/promo.module';
import { JobTemplate } from './modules/job-templates/job-template.entity';
import { JobTemplatesModule } from './modules/job-templates/job-templates.module';
import { StatementsModule } from './modules/statements/statements.module';
import { UserBlock } from './modules/user-blocks/user-block.entity';
import { UserReport } from './modules/user-blocks/user-report.entity';
import { UserBlocksModule } from './modules/user-blocks/user-blocks.module';
import { PasswordResetToken } from './modules/auth/password-reset-token.entity';
import { EmailVerificationToken } from './modules/auth/email-verification-token.entity';
import { SmsOtp } from './modules/auth/sms-otp.entity';
import { AdminAuditLog } from './modules/admin-audit/admin-audit-log.entity';
import { AdminAuditModule } from './modules/admin-audit/admin-audit.module';
import { SystemSetting } from './modules/system-settings/system-setting.entity';
import { SystemSettingsModule } from './modules/system-settings/system-settings.module';
import { LeadRequest } from './modules/leads/lead-request.entity';
import { LeadsModule } from './modules/leads/leads.module';
import { SubscriptionPlan } from './modules/subscriptions/subscription-plan.entity';
import { UserSubscription } from './modules/subscriptions/user-subscription.entity';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { Currency } from './modules/currencies/currency.entity';
import { CurrenciesModule } from './modules/currencies/currencies.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { Tenant } from './modules/tenants/tenant.entity';
import { TenantsModule } from './modules/tenants/tenants.module';
import { EmailModule } from './modules/email/email.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}.local`, `.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
    }),
    // Global in-memory cache (TTL: 30 saniye, max 500 item)
    CacheModule.register({ isGlobal: true, ttl: 30000, max: 500 }),
    // Global rate limiting: dakikada 60 istek (IP başına)
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get<string>('DB_TYPE') || 'postgres';
        const isProd = process.env.NODE_ENV === 'production';
        // In prod: synchronize OFF, run pending migrations on boot.
        // In dev: keep current synchronize behavior (auto schema from entities).
        const synchronize = !isProd;
        const migrationsRun = isProd;
        const migrations = [`${__dirname}/migrations/*{.js,.ts}`];
        const entities = [
          User,
          Job,
          Offer,
          Review,
          Category,
          TokenTransaction,
          ServiceRequest,
          ServiceRequestApplication,
          Booking,
          Notification,
          Provider,
          ChatMessage,
          JobQuestion,
          JobQuestionReply,
          SavedJob,
          OnboardingSlide,
          FavoriteProvider,
          FavoriteWorker,
          SavedJobSearch,
          PaymentEscrow,
          BookingEscrow,
          CancellationPolicy,
          JobDispute,
          Dispute,
          AvailabilitySlot,
          AvailabilityBlackout,
          PromoCode,
          PromoRedemption,
          JobTemplate,
          UserBlock,
          UserReport,
          PasswordResetToken,
          EmailVerificationToken,
          SmsOtp,
          AdminAuditLog,
          SystemSetting,
          LeadRequest,
          SubscriptionPlan,
          UserSubscription,
          Currency,
          Tenant,
        ];
        if (dbType === 'sqlite') {
          return {
            type: 'sqlite' as const,
            database: 'hizmet_db.sqlite',
            entities,
            migrations,
            synchronize,
            migrationsRun,
          };
        }
        if (dbType === 'mysql') {
          return {
            type: 'mysql' as const,
            host: configService.get<string>('DB_HOST'),
            port: configService.get<number>('DB_PORT') || 3306,
            username: configService.get<string>('DB_USERNAME'),
            password: configService.get<string>('DB_PASSWORD'),
            database: configService.get<string>('DB_NAME') || configService.get<string>('DB_DATABASE'),
            charset: 'utf8mb4_unicode_ci',
            entities,
            migrations,
            synchronize: isProd ? false : configService.get<string>('DB_SYNCHRONIZE') !== 'false',
            migrationsRun,
          };
        }
        return {
          type: 'postgres' as const,
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT') || 5432,
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_DATABASE') || configService.get<string>('DB_NAME'),
          entities,
          migrations,
          synchronize,
          migrationsRun,
        };
      },
      inject: [ConfigService],
    }),
    AdminAuditModule,
    SystemSettingsModule,
    AuthModule,
    UsersModule,
    JobsModule,
    ChatModule,
    PaymentsModule,
    ReviewsModule,
    AiModule,
    CategoriesModule,
    AdminModule,
    HealthModule,
    TokensModule,
    UploadsModule,
    ServiceRequestsModule,
    BookingsModule,
    NotificationsModule,
    OnboardingModule,
    FavoritesModule,
    EscrowModule,
    CancellationModule,
    DisputesModule,
    AvailabilityModule,
    PromoModule,
    JobTemplatesModule,
    StatementsModule,
    CronModule,
    ModerationModule,
    UserBlocksModule,
    LeadsModule,
    SubscriptionsModule,
    CurrenciesModule,
    LoyaltyModule,
    TenantsModule,
    EmailModule,
    // Provide User & Job repositories for AppController public stats endpoint
    TypeOrmModule.forFeature([User, Job]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
