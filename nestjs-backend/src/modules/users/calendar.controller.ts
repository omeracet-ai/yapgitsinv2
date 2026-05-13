import { Controller, Get, Header, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CalendarService } from './calendar.service';

/**
 * Phase 177 — Worker calendar .ics export.
 *
 * GET /users/me/calendar.ics → RFC 5545 VCALENDAR (text/calendar) of the
 * authenticated user's worker bookings. Subscribe-friendly: Google
 * Calendar / Apple Calendar can poll the URL with the JWT.
 */
@Controller('users/me')
export class CalendarController {
  constructor(private readonly svc: CalendarService) {}

  @Get('calendar.ics')
  @UseGuards(AuthGuard('jwt'))
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="yapgitsin-calendar.ics"')
  async getIcs(@Req() req: any): Promise<string> {
    const userId = req.user.id;
    const bookings = await this.svc.findWorkerBookings(userId);
    return this.svc.generateIcs(bookings);
  }
}
