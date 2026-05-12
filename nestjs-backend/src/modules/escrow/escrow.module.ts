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
  providers: [EscrowService, FeeService, IyzipayService, BookingEscrowService],
  exports: [EscrowService, FeeService, IyzipayService, BookingEscrowService],
})
export class EscrowModule {}
