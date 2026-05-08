import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './booking.entity';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AvailabilityModule } from '../availability/availability.module';
import { TokenTransaction } from '../tokens/token-transaction.entity';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { EscrowModule } from '../escrow/escrow.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, TokenTransaction]),
    UsersModule,
    NotificationsModule,
    AvailabilityModule,
    AdminAuditModule,
    EscrowModule,
  ],
  providers: [BookingsService],
  controllers: [BookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}
