import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEscrow } from './payment-escrow.entity';
import { EscrowService } from './escrow.service';
import { FeeService } from './fee.service';
import { IyzipayService } from './iyzipay.service';
import { EscrowController } from './escrow.controller';
import { EscrowAdminController } from './escrow-admin.controller';
import { BookingEscrow } from './booking-escrow.entity';
import { BookingEscrowService } from './booking-escrow.service';
import { BookingEscrowController } from './booking-escrow.controller';
import { Booking } from '../bookings/booking.entity';
import { TokenTransaction } from '../tokens/token-transaction.entity';
import { AdminAuditLog } from '../admin-audit/admin-audit-log.entity';
import { EscrowConfirmationPhoto } from './escrow-confirmation-photo.entity';
import { EscrowConfirmationVideo } from './escrow-confirmation-video.entity';
import { EscrowConfirmationService } from './escrow-confirmation.service';
import { EscrowConfirmationController } from './escrow-confirmation.controller';
import { EscrowConfirmationListController } from './escrow-confirmation-list.controller';
import { EscrowConfirmationTimeoutService } from './escrow-confirmation-timeout.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/user.entity';
import { Job } from '../jobs/job.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentEscrow,
      BookingEscrow,
      Booking,
      TokenTransaction,
      AdminAuditLog,
      EscrowConfirmationPhoto,
      EscrowConfirmationVideo,
      User,
      Job,
    ]),
    NotificationsModule,
  ],
  controllers: [
    EscrowController,
    EscrowAdminController,
    BookingEscrowController,
    // Phase 279: list controller'ı :id swallow'undan önce kaydet
    EscrowConfirmationListController,
    EscrowConfirmationController,
  ],
  providers: [
    EscrowService,
    FeeService,
    IyzipayService,
    BookingEscrowService,
    EscrowConfirmationService,
    EscrowConfirmationTimeoutService,
  ],
  exports: [EscrowService, FeeService, IyzipayService, BookingEscrowService],
})
export class EscrowModule {}
