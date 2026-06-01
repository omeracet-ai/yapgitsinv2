import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../bookings/booking.entity';
import { LocationGateway } from './location.gateway';

/**
 * Phase 354 — Live location sharing prototype module.
 * In-memory broadcast, no persistence. Devre dışı bırakmak için
 * app.module.ts'den `LocationModule` kaldırılabilir.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Booking])],
  providers: [LocationGateway],
})
export class LocationModule {}
