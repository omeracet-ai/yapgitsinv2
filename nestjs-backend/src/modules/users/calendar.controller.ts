import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { CalendarService } from './calendar.service';

/**
 * Phase 177 — Worker calendar .ics export (Bearer JWT).
 * Phase 179 — URL-token alternative for Google/Apple Calendar subscribe-by-URL
 * (which cannot send Authorization headers).
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

  /** Phase 179 — issue/rotate the URL token for subscribe-by-URL. */
  @Post('calendar/token')
  @UseGuards(AuthGuard('jwt'))
  async createToken(@Req() req: any): Promise<{ token: string; url: string }> {
    const userId = req.user.id;
    const token = await this.svc.rotateCalendarToken(userId);
    const base = process.env.PUBLIC_API_URL || 'https://api.yapgitsin.tr';
    return { token, url: `${base}/calendar/${token}/feed.ics` };
  }

  /** Phase 179 — revoke the token (subscriber URL stops working). */
  @Delete('calendar/token')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  async revokeToken(@Req() req: any): Promise<{ ok: true }> {
    await this.svc.revokeCalendarToken(req.user.id);
    return { ok: true };
  }
}

/**
 * Phase 179 — public token-based feed endpoint (no auth header required).
 * Brute-force shielded by an extra 10/min throttle on top of the global.
 */
@Controller('calendar')
export class CalendarPublicController {
  constructor(private readonly svc: CalendarService) {}

  @Get(':token/feed.ics')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async publicFeed(
    @Param('token') token: string,
    @Res() res: any,
  ): Promise<void> {
    const user = await this.svc.findUserByCalendarToken(token);
    if (!user) throw new NotFoundException('Calendar feed not found');
    const bookings = await this.svc.findWorkerBookings(user.id);
    const body = this.svc.generateIcs(bookings);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="yapgitsin-calendar.ics"',
    );
    res.send(body);
  }
}
