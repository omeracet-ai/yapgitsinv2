"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const moderation_module_1 = require("./modules/moderation/moderation.module");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const user_or_ip_throttler_guard_1 = require("./common/guards/user-or-ip.throttler.guard");
const schedule_1 = require("@nestjs/schedule");
const cache_manager_1 = require("@nestjs/cache-manager");
const cache_config_1 = require("./common/cache/cache.config");
const cron_module_1 = require("./modules/cron/cron.module");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const typeorm_1 = require("@nestjs/typeorm");
const path_1 = require("path");
const paths_1 = require("./common/paths");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const jobs_module_1 = require("./modules/jobs/jobs.module");
const chat_module_1 = require("./modules/chat/chat.module");
const user_entity_1 = require("./modules/users/user.entity");
const job_entity_1 = require("./modules/jobs/job.entity");
const offer_entity_1 = require("./modules/jobs/offer.entity");
const payments_module_1 = require("./modules/payments/payments.module");
const review_entity_1 = require("./modules/reviews/review.entity");
const review_helpful_entity_1 = require("./modules/reviews/review-helpful.entity");
const reviews_module_1 = require("./modules/reviews/reviews.module");
const ai_module_1 = require("./modules/ai/ai.module");
const category_entity_1 = require("./modules/categories/category.entity");
const categories_module_1 = require("./modules/categories/categories.module");
const admin_module_1 = require("./modules/admin/admin.module");
const health_module_1 = require("./modules/health/health.module");
const tokens_module_1 = require("./modules/tokens/tokens.module");
const blog_module_1 = require("./modules/blog/blog.module");
const blog_post_entity_1 = require("./modules/blog/blog-post.entity");
const token_transaction_entity_1 = require("./modules/tokens/token-transaction.entity");
const uploads_module_1 = require("./modules/uploads/uploads.module");
const service_request_entity_1 = require("./modules/service-requests/service-request.entity");
const service_request_application_entity_1 = require("./modules/service-requests/service-request-application.entity");
const service_requests_module_1 = require("./modules/service-requests/service-requests.module");
const booking_entity_1 = require("./modules/bookings/booking.entity");
const bookings_module_1 = require("./modules/bookings/bookings.module");
const notification_entity_1 = require("./modules/notifications/notification.entity");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const provider_entity_1 = require("./modules/providers/provider.entity");
const chat_message_entity_1 = require("./modules/chat/chat-message.entity");
const job_question_entity_1 = require("./modules/jobs/job-question.entity");
const job_question_reply_entity_1 = require("./modules/jobs/job-question-reply.entity");
const saved_job_entity_1 = require("./modules/jobs/saved-job.entity");
const onboarding_slide_entity_1 = require("./modules/onboarding/onboarding-slide.entity");
const onboarding_module_1 = require("./modules/onboarding/onboarding.module");
const favorite_provider_entity_1 = require("./modules/favorites/favorite-provider.entity");
const favorite_worker_entity_1 = require("./modules/users/favorite-worker.entity");
const saved_job_search_entity_1 = require("./modules/favorites/saved-job-search.entity");
const favorites_module_1 = require("./modules/favorites/favorites.module");
const payment_escrow_entity_1 = require("./modules/escrow/payment-escrow.entity");
const booking_escrow_entity_1 = require("./modules/escrow/booking-escrow.entity");
const escrow_module_1 = require("./modules/escrow/escrow.module");
const cancellation_policy_entity_1 = require("./modules/cancellation/cancellation-policy.entity");
const cancellation_module_1 = require("./modules/cancellation/cancellation.module");
const job_dispute_entity_1 = require("./modules/disputes/job-dispute.entity");
const dispute_entity_1 = require("./modules/disputes/dispute.entity");
const disputes_module_1 = require("./modules/disputes/disputes.module");
const availability_slot_entity_1 = require("./modules/availability/availability-slot.entity");
const availability_blackout_entity_1 = require("./modules/availability/availability-blackout.entity");
const availability_module_1 = require("./modules/availability/availability.module");
const promo_code_entity_1 = require("./modules/promo/promo-code.entity");
const promo_redemption_entity_1 = require("./modules/promo/promo-redemption.entity");
const promo_module_1 = require("./modules/promo/promo.module");
const job_template_entity_1 = require("./modules/job-templates/job-template.entity");
const job_templates_module_1 = require("./modules/job-templates/job-templates.module");
const statements_module_1 = require("./modules/statements/statements.module");
const user_block_entity_1 = require("./modules/user-blocks/user-block.entity");
const user_report_entity_1 = require("./modules/user-blocks/user-report.entity");
const user_blocks_module_1 = require("./modules/user-blocks/user-blocks.module");
const password_reset_token_entity_1 = require("./modules/auth/password-reset-token.entity");
const email_verification_token_entity_1 = require("./modules/auth/email-verification-token.entity");
const sms_otp_entity_1 = require("./modules/auth/sms-otp.entity");
const admin_audit_log_entity_1 = require("./modules/admin-audit/admin-audit-log.entity");
const admin_audit_module_1 = require("./modules/admin-audit/admin-audit.module");
const system_setting_entity_1 = require("./modules/system-settings/system-setting.entity");
const system_settings_module_1 = require("./modules/system-settings/system-settings.module");
const lead_request_entity_1 = require("./modules/leads/lead-request.entity");
const leads_module_1 = require("./modules/leads/leads.module");
const subscription_plan_entity_1 = require("./modules/subscriptions/subscription-plan.entity");
const user_subscription_entity_1 = require("./modules/subscriptions/user-subscription.entity");
const category_subscription_entity_1 = require("./modules/subscriptions/category-subscription.entity");
const subscriptions_module_1 = require("./modules/subscriptions/subscriptions.module");
const currency_entity_1 = require("./modules/currencies/currency.entity");
const currencies_module_1 = require("./modules/currencies/currencies.module");
const loyalty_module_1 = require("./modules/loyalty/loyalty.module");
const tenant_entity_1 = require("./modules/tenants/tenant.entity");
const tenants_module_1 = require("./modules/tenants/tenants.module");
const email_module_1 = require("./modules/email/email.module");
const boost_entity_1 = require("./modules/boost/boost.entity");
const boost_module_1 = require("./modules/boost/boost.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const payment_entity_1 = require("./modules/payments/payment.entity");
const reputation_module_1 = require("./modules/reputation/reputation.module");
const reputation_entity_1 = require("./modules/reputation/reputation.entity");
const badge_entity_1 = require("./modules/reputation/badge.entity");
const admin_seed_module_1 = require("./modules/admin-seed/admin-seed.module");
const stats_module_1 = require("./modules/stats/stats.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: [
                    (0, path_1.join)(paths_1.APP_ROOT, `.env.${process.env.NODE_ENV ?? 'development'}.local`),
                    (0, path_1.join)(paths_1.APP_ROOT, `.env.${process.env.NODE_ENV ?? 'development'}`),
                    (0, path_1.join)(paths_1.APP_ROOT, '.env'),
                ],
            }),
            cache_manager_1.CacheModule.registerAsync(cache_config_1.cacheConfigAsync),
            throttler_1.ThrottlerModule.forRoot([
                { name: 'short', ttl: 1_000, limit: 100 },
                { name: 'medium', ttl: 10_000, limit: 400 },
                { name: 'long', ttl: 60_000, limit: 600 },
                { name: 'default', ttl: 60_000, limit: 600 },
                { name: 'auth-login', ttl: 60_000, limit: 20 },
                { name: 'auth-register', ttl: 3_600_000, limit: 10 },
                { name: 'uploads', ttl: 60_000, limit: 10 },
            ]),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => {
                    const dbType = configService.get('DB_TYPE') || 'postgres';
                    const isProd = process.env.NODE_ENV === 'production';
                    const synchronize = !isProd;
                    const migrationsRun = isProd;
                    const migrations = [`${__dirname}/migrations/*{.js,.ts}`];
                    const entities = [
                        user_entity_1.User,
                        job_entity_1.Job,
                        offer_entity_1.Offer,
                        review_entity_1.Review,
                        review_helpful_entity_1.ReviewHelpful,
                        category_entity_1.Category,
                        token_transaction_entity_1.TokenTransaction,
                        service_request_entity_1.ServiceRequest,
                        service_request_application_entity_1.ServiceRequestApplication,
                        booking_entity_1.Booking,
                        notification_entity_1.Notification,
                        provider_entity_1.Provider,
                        chat_message_entity_1.ChatMessage,
                        job_question_entity_1.JobQuestion,
                        job_question_reply_entity_1.JobQuestionReply,
                        saved_job_entity_1.SavedJob,
                        onboarding_slide_entity_1.OnboardingSlide,
                        favorite_provider_entity_1.FavoriteProvider,
                        favorite_worker_entity_1.FavoriteWorker,
                        saved_job_search_entity_1.SavedJobSearch,
                        payment_escrow_entity_1.PaymentEscrow,
                        booking_escrow_entity_1.BookingEscrow,
                        cancellation_policy_entity_1.CancellationPolicy,
                        job_dispute_entity_1.JobDispute,
                        dispute_entity_1.Dispute,
                        availability_slot_entity_1.AvailabilitySlot,
                        availability_blackout_entity_1.AvailabilityBlackout,
                        promo_code_entity_1.PromoCode,
                        promo_redemption_entity_1.PromoRedemption,
                        job_template_entity_1.JobTemplate,
                        user_block_entity_1.UserBlock,
                        user_report_entity_1.UserReport,
                        password_reset_token_entity_1.PasswordResetToken,
                        email_verification_token_entity_1.EmailVerificationToken,
                        sms_otp_entity_1.SmsOtp,
                        admin_audit_log_entity_1.AdminAuditLog,
                        system_setting_entity_1.SystemSetting,
                        lead_request_entity_1.LeadRequest,
                        subscription_plan_entity_1.SubscriptionPlan,
                        user_subscription_entity_1.UserSubscription,
                        category_subscription_entity_1.CategorySubscription,
                        currency_entity_1.Currency,
                        tenant_entity_1.Tenant,
                        boost_entity_1.Boost,
                        blog_post_entity_1.BlogPost,
                        payment_entity_1.Payment,
                        reputation_entity_1.Reputation,
                        badge_entity_1.Badge,
                    ];
                    if (dbType === 'sqlite') {
                        const sqliteName = configService.get('DB_DATABASE') ||
                            configService.get('DB_NAME') ||
                            'hizmet_db.sqlite';
                        const sqlitePath = sqliteName === ':memory:' || (0, path_1.isAbsolute)(sqliteName)
                            ? sqliteName
                            : (0, path_1.join)(paths_1.APP_ROOT, sqliteName);
                        return {
                            type: 'sqlite',
                            database: sqlitePath,
                            entities,
                            autoLoadEntities: true,
                            migrations,
                            synchronize,
                            migrationsRun,
                        };
                    }
                    if (dbType === 'mysql') {
                        return {
                            type: 'mysql',
                            host: configService.get('DB_HOST'),
                            port: configService.get('DB_PORT') || 3306,
                            username: configService.get('DB_USERNAME'),
                            password: configService.get('DB_PASSWORD'),
                            database: configService.get('DB_NAME') || configService.get('DB_DATABASE'),
                            charset: 'utf8mb4_unicode_ci',
                            entities,
                            migrations,
                            synchronize: isProd ? false : configService.get('DB_SYNCHRONIZE') !== 'false',
                            migrationsRun,
                        };
                    }
                    return {
                        type: 'postgres',
                        host: configService.get('DB_HOST'),
                        port: configService.get('DB_PORT') || 5432,
                        username: configService.get('DB_USERNAME'),
                        password: configService.get('DB_PASSWORD'),
                        database: configService.get('DB_DATABASE') || configService.get('DB_NAME'),
                        entities,
                        migrations,
                        synchronize,
                        migrationsRun,
                    };
                },
                inject: [config_1.ConfigService],
            }),
            admin_audit_module_1.AdminAuditModule,
            system_settings_module_1.SystemSettingsModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            jobs_module_1.JobsModule,
            chat_module_1.ChatModule,
            payments_module_1.PaymentsModule,
            reviews_module_1.ReviewsModule,
            ai_module_1.AiModule,
            categories_module_1.CategoriesModule,
            admin_module_1.AdminModule,
            health_module_1.HealthModule,
            tokens_module_1.TokensModule,
            uploads_module_1.UploadsModule,
            service_requests_module_1.ServiceRequestsModule,
            bookings_module_1.BookingsModule,
            notifications_module_1.NotificationsModule,
            onboarding_module_1.OnboardingModule,
            favorites_module_1.FavoritesModule,
            escrow_module_1.EscrowModule,
            cancellation_module_1.CancellationModule,
            disputes_module_1.DisputesModule,
            availability_module_1.AvailabilityModule,
            promo_module_1.PromoModule,
            job_templates_module_1.JobTemplatesModule,
            statements_module_1.StatementsModule,
            cron_module_1.CronModule,
            moderation_module_1.ModerationModule,
            user_blocks_module_1.UserBlocksModule,
            leads_module_1.LeadsModule,
            subscriptions_module_1.SubscriptionsModule,
            currencies_module_1.CurrenciesModule,
            loyalty_module_1.LoyaltyModule,
            tenants_module_1.TenantsModule,
            email_module_1.EmailModule,
            boost_module_1.BoostModule,
            blog_module_1.BlogModule,
            analytics_module_1.AnalyticsModule,
            reputation_module_1.ReputationModule,
            admin_seed_module_1.AdminSeedModule,
            stats_module_1.StatsModule,
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, job_entity_1.Job]),
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            { provide: core_1.APP_GUARD, useClass: user_or_ip_throttler_guard_1.UserOrIpThrottlerGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map