import { Module } from '@nestjs/common';
import { ModerationModule } from './modules/moderation/moderation.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserOrIpThrottlerGuard } from './common/guards/user-or-ip.throttler.guard';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { cacheConfigAsync } from './common/cache/cache.config';
import { CronModule } from './modules/cron/cron.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { isAbsolute, join } from 'path';
import { APP_ROOT } from './common/paths';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ChatModule } from './modules/chat/chat.module';
import { User } from './modules/users/user.entity';
import { Job } from './modules/jobs/job.entity';
import { Offer } from './modules/jobs/offer.entity';
import { PaymentsModule } from './modules/payments/payments.module';
import { Review } from './modules/reviews/review.entity';
import { ReviewHelpful } from './modules/reviews/review-helpful.entity';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AiModule } from './modules/ai/ai.module';
import { Category } from './modules/categories/category.entity';
import { CategoriesModule } from './modules/categories/categories.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { TokensModule } from './modules/tokens/tokens.module';
import { BlogModule } from './modules/blog/blog.module';
import { BlogPost } from './modules/blog/blog-post.entity';
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
import { IyzicoModule } from './modules/iyzico/iyzico.module';
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
import { CategorySubscription } from './modules/subscriptions/category-subscription.entity';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { Currency } from './modules/currencies/currency.entity';
import { CurrenciesModule } from './modules/currencies/currencies.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { Tenant } from './modules/tenants/tenant.entity';
import { TenantsModule } from './modules/tenants/tenants.module';
import { EmailModule } from './modules/email/email.module';
import { Boost } from './modules/boost/boost.entity';
import { BoostModule } from './modules/boost/boost.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { Payment } from './modules/payments/payment.entity';
import { ReputationModule } from './modules/reputation/reputation.module';
import { Reputation } from './modules/reputation/reputation.entity';
import { Badge } from './modules/reputation/badge.entity';
import { AdminSeedModule } from './modules/admin-seed/admin-seed.module';
import { StatsModule } from './modules/stats/stats.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      // iisnode/Plesk Node altında process.cwd() != uygulama dizini olduğundan
      // .env dosyalarını APP_ROOT'a (= package.json/.env'in bulunduğu kök) göre çözüyoruz.
      envFilePath: [
        join(APP_ROOT, `.env.${process.env.NODE_ENV ?? 'development'}.local`),
        join(APP_ROOT, `.env.${process.env.NODE_ENV ?? 'development'}`),
        join(APP_ROOT, '.env'),
      ],
    }),
    // Phase 170 — Cache katmanı: REDIS_URL varsa Redis, yoksa in-memory (graceful fallback).
    CacheModule.registerAsync(cacheConfigAsync),
    // Phase 170 / P191/5 / 229A — Multi-tier named throttlers (burst-tolerant).
    //
    // NestJS Throttler v6 semantics: EVERY named definition listed in forRoot()
    // is evaluated on EVERY route. `@Throttle({ name: {...} })` only OVERRIDES
    // that single bucket for that route — it does NOT disable the others.
    // The most-restrictive bucket wins.
    //
    // Phase 229A fix (Voldi-sec): pre-fix the global `auth-register` (10/3600s),
    // `auth-login` (20/60s) and `uploads` (10/60s) buckets were silently capping
    // ALL routes app-wide — e.g. /auth/firebase was actually 10 req/hour per IP,
    // because `auth-register` applies even though the decorator only overrides
    // `auth-login`. Google sign-in would lock out after 10 fails. Same problem
    // for any user hitting > 10 uploads/min on any non-upload route.
    //
    // New design — generic tiers carry real limits; auth/upload buckets exist
    // ONLY as "named slots" route decorators can sharpen. Their forRoot caps
    // are effectively unbounded so they never act as a global ceiling.
    //
    //   short:   100 req /   1s  — burst absorption (Flutter app + admin polls)
    //   medium:  400 req /  10s  — sustained polling window
    //   long:    600 req /  60s  — per-minute ceiling
    //   default: 600 req /  60s  — legacy/compat tier
    //   auth-login:    EFFECTIVELY DISABLED globally — route override required
    //   auth-register: EFFECTIVELY DISABLED globally — route override required
    //   uploads:       EFFECTIVELY DISABLED globally — route override required
    //
    // Active overrides (see controllers):
    //   /auth/login, /auth/firebase, /auth/admin/login → auth-login: 20/60s
    //   /auth/sms/request                              → auth-login: 10/60s
    //   /auth/register                                 → auth-register: 3/3600s
    //   /uploads/*                                     → uploads: 30/60s
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1_000, limit: 100 },
      { name: 'medium', ttl: 10_000, limit: 400 },
      { name: 'long', ttl: 60_000, limit: 600 },
      { name: 'default', ttl: 60_000, limit: 600 },
      // Phase 229A: these three are no-op globals — route decorators set real limits.
      { name: 'auth-login', ttl: 60_000, limit: 1_000_000 },
      { name: 'auth-register', ttl: 60_000, limit: 1_000_000 },
      { name: 'uploads', ttl: 60_000, limit: 1_000_000 },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get<string>('DB_TYPE') || 'postgres';
        const nodeEnv = process.env.NODE_ENV;
        const isProd = nodeEnv === 'production';
        const isDev = nodeEnv === 'development';
        // P222 — Strict opt-in: synchronize requires ALLOW_SCHEMA_SYNC=true OR NODE_ENV=development.
        // If NODE_ENV is unset/missing, default to SECURE (synchronize OFF, run migrations).
        // This prevents accidental schema rewrites in prod when env vars are missing.
        const allowSync = isDev || process.env.ALLOW_SCHEMA_SYNC === 'true';
        const synchronize = allowSync;
        const migrationsRun = !allowSync;
        const migrations = [`${__dirname}/migrations/*{.js,.ts}`];
        const entities = [
          User,
          Job,
          Offer,
          Review,
          ReviewHelpful,
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
          CategorySubscription,
          Currency,
          Tenant,
          Boost,
          BlogPost,
          Payment,
          Reputation,
          Badge,
        ];
        if (dbType === 'sqlite') {
          // DB_DATABASE override allows isolated test DBs (e.g. ':memory:'); defaults to dev file.
          // Resolve relative names against APP_ROOT — under iisnode process.cwd() is
          // C:\Windows\System32\inetsrv (no write access). ':memory:' and absolute paths pass through.
          const sqliteName =
            configService.get<string>('DB_DATABASE') ||
            configService.get<string>('DB_NAME') ||
            'hizmet_db.sqlite';
          const sqlitePath =
            sqliteName === ':memory:' || isAbsolute(sqliteName)
              ? sqliteName
              : join(APP_ROOT, sqliteName);
          return {
            type: 'sqlite' as const,
            database: sqlitePath,
            entities,
            // Pick up entities only registered via TypeOrmModule.forFeature (e.g. JobLead)
            // so the in-memory e2e schema is complete.
            autoLoadEntities: true,
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
            synchronize: allowSync && configService.get<string>('DB_SYNCHRONIZE') !== 'false',
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
    IyzicoModule,
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
    BoostModule,
    BlogModule,
    AnalyticsModule,
    ReputationModule,
    AdminSeedModule,
    StatsModule,
    MaintenanceModule,
    // Provide User & Job repositories for AppController public stats endpoint
    TypeOrmModule.forFeature([User, Job]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: UserOrIpThrottlerGuard },
  ],
})
export class AppModule {}
