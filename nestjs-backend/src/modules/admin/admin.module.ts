import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Job } from '../jobs/job.entity';
import { Offer } from '../jobs/offer.entity';
import { User } from '../users/user.entity';
import { ServiceRequest } from '../service-requests/service-request.entity';
import { Booking } from '../bookings/booking.entity';
import { Review } from '../reviews/review.entity';
import { PaymentEscrow } from '../escrow/payment-escrow.entity';
import { ChatMessage } from '../chat/chat-message.entity';
import { JobQuestion } from '../jobs/job-question.entity';
import { Provider } from '../providers/provider.entity';
import { Notification } from '../notifications/notification.entity';
import { AdminAuditLog } from '../admin-audit/admin-audit-log.entity';
// Phase 401 — Admin dashboard "Kullanılan krediler" toplamı için.
import { TokenTransaction } from '../tokens/token-transaction.entity';
import { CategoriesModule } from '../categories/categories.module';
import { ProvidersModule } from '../providers/providers.module';
import { PromoModule } from '../promo/promo.module';
import { UserBlocksModule } from '../user-blocks/user-blocks.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TokensModule } from '../tokens/tokens.module';
// Phase 510 — Token ekonomisi setting'lerini admin commission ekranından
// edit edebilmek için AppConfigService inject ediyoruz.
import { AppConfigModule } from '../app-config/app-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Job,
      Offer,
      User,
      ServiceRequest,
      Booking,
      Review,
      PaymentEscrow,
      ChatMessage,
      JobQuestion,
      Notification,
      AdminAuditLog,
      Provider,
      TokenTransaction,
    ]),
    CategoriesModule,
    ProvidersModule,
    PromoModule,
    UserBlocksModule,
    UsersModule,
    NotificationsModule,
    TokensModule,
    AppConfigModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
