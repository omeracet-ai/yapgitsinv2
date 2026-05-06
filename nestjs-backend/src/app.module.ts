import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
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
import { OnboardingSlide } from './modules/onboarding/onboarding-slide.entity';
import { OnboardingModule } from './modules/onboarding/onboarding.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global in-memory cache (TTL: 30 saniye, max 500 item)
    CacheModule.register({ isGlobal: true, ttl: 30000, max: 500 }),
    // Global rate limiting: dakikada 60 istek (IP başına)
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get<string>('DB_TYPE') || 'postgres';
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
          OnboardingSlide,
        ];
        if (dbType === 'sqlite') {
          return {
            type: 'sqlite' as const,
            database: 'hizmet_db.sqlite',
            entities,
            synchronize: true,
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
            entities,
            synchronize: true,
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
          synchronize: true,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    JobsModule,
    ChatModule,
    PaymentsModule,
    ReviewsModule,
    AiModule,
    CategoriesModule,
    AdminModule,
    TokensModule,
    UploadsModule,
    ServiceRequestsModule,
    BookingsModule,
    NotificationsModule,
    OnboardingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
