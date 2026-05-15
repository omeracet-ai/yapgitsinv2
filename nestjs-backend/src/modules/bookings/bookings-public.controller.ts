import { Controller, Get, Param, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BookingsService } from './bookings.service';

/** Phase 153: Public availability endpoint — class-level auth guard YOK */
@Controller('bookings')
export class BookingsPublicController {
  constructor(private readonly svc: BookingsService) {}

  /** GET /bookings/availability/:userId?date=YYYY-MM-DD */
  @SkipThrottle()
  @Get('availability/:userId')
  availability(
    @Param('userId') userId: string,
    @Query('date') date?: string,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    return this.svc.getAvailabilityForDate(userId, date || today);
  }
}
