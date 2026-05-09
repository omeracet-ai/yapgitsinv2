import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEscrow } from './payment-escrow.entity';
import { EscrowService } from './escrow.service';
import { EscrowController } from './escrow.controller';
import { EscrowAdminController } from './escrow-admin.controller';
import { BookingEscrow } from './booking-escrow.entity';
import { BookingEscrowService } from './booking-escrow.service';
import { BookingEscrowController } from './booking-escrow.controller';
import { Booking } from '../bookings/booking.entity';
import { TokenTransaction } from '../tokens/token-transaction.entity';
import { AdminAuditLog } from '../admin-audit/admin-audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentEscrow,
      BookingEscrow,
      Booking,
      TokenTransaction,
      AdminAuditLog,
    ]),
  ],
  controllers: [EscrowController, EscrowAdminController, BookingEscrowController],
  providers: [EscrowService, BookingEscrowService],
  exports: [EscrowService, BookingEscrowService],
})
export class EscrowModule {}
