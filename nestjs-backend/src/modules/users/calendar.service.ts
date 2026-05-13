import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Booking, BookingStatus } from '../bookings/booking.entity';
import { User } from './user.entity';

/**
 * Phase 177 — Worker calendar .ics export (RFC 5545).
 *
 * Generates a VCALENDAR feed for a worker's confirmed/in-progress/completed
 * bookings (last 365 days + future). Used by GET /users/me/calendar.ics so
 * the worker can subscribe from Google Calendar / Apple Calendar.
 */
@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ── Phase 179 — Calendar token (URL-based auth for subscribe-by-URL) ──

  private generateToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  async getOrCreateCalendarToken(userId: string): Promise<string> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    if (user.calendarToken) return user.calendarToken;
    const token = this.generateToken();
    user.calendarToken = token;
    await this.userRepo.save(user);
    return token;
  }

  async rotateCalendarToken(userId: string): Promise<string> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    const token = this.generateToken();
    user.calendarToken = token;
    await this.userRepo.save(user);
    return token;
  }

  async revokeCalendarToken(userId: string): Promise<void> {
    await this.userRepo.update({ id: userId }, { calendarToken: null });
  }

  async findUserByCalendarToken(token: string): Promise<User | null> {
    if (!token || token.length < 16) return null;
    return this.userRepo.findOne({ where: { calendarToken: token } });
  }

  async findWorkerBookings(workerId: string): Promise<Booking[]> {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const rows = await this.bookingRepo.find({
      where: {
        workerId,
        status: In([
          BookingStatus.CONFIRMED,
          BookingStatus.IN_PROGRESS,
          BookingStatus.COMPLETED,
        ]),
      },
      order: { scheduledDate: 'ASC' },
      take: 500,
    });
    return rows.filter((b) => {
      const created = b.createdAt ? new Date(b.createdAt) : null;
      return !created || created >= oneYearAgo;
    });
  }

  /** RFC 5545 text escape: backslash, comma, semicolon, newline. */
  private escapeText(input: string | null | undefined): string {
    if (!input) return '';
    return String(input)
      .replace(/\\/g, '\\\\')
      .replace(/\r\n/g, '\\n')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  }

  /** Fold long lines at 75 octets per RFC 5545 §3.1. */
  private foldLine(line: string): string {
    if (line.length <= 75) return line;
    const parts: string[] = [];
    let i = 0;
    while (i < line.length) {
      parts.push((i === 0 ? '' : ' ') + line.slice(i, i + (i === 0 ? 75 : 74)));
      i += i === 0 ? 75 : 74;
    }
    return parts.join('\r\n');
  }

  /** Format Date → UTC "YYYYMMDDTHHmmssZ". */
  private fmtUtc(d: Date): string {
    const pad = (n: number, w = 2) => String(n).padStart(w, '0');
    return (
      d.getUTCFullYear().toString() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      'T' +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) +
      'Z'
    );
  }

  /** Build event start/end Date from scheduledDate (YYYY-MM-DD) + scheduledTime (HH:MM). */
  private buildEventDates(b: Booking): { start: Date; end: Date } {
    const date = b.scheduledDate || '1970-01-01';
    const time = b.scheduledTime || '09:00';
    // Treat as local Turkey time would require tz; safest: parse as UTC.
    const iso = `${date}T${time.length === 5 ? time + ':00' : time}Z`;
    const start = new Date(iso);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // default 2h
    return { start, end };
  }

  generateIcs(bookings: Booking[]): string {
    const lines: string[] = [];
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//Yapgitsin//Worker Calendar//TR');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:PUBLISH');
    lines.push('X-WR-CALNAME:Yapgitsin Takvim');
    lines.push('X-WR-TIMEZONE:Europe/Istanbul');

    const stamp = this.fmtUtc(new Date());

    for (const b of bookings) {
      const { start, end } = this.buildEventDates(b);
      if (isNaN(start.getTime())) continue;
      const summary = this.escapeText(
        `${b.category || 'Hizmet'}${b.subCategory ? ' - ' + b.subCategory : ''}`,
      );
      const descParts = [
        b.description ? `Açıklama: ${b.description}` : '',
        b.customerNote ? `Müşteri Notu: ${b.customerNote}` : '',
        b.workerNote ? `Notum: ${b.workerNote}` : '',
        `Durum: ${b.status}`,
      ].filter(Boolean);
      const description = this.escapeText(descParts.join('\n'));
      const location = this.escapeText(b.address);
      const icsStatus =
        b.status === BookingStatus.CANCELLED
          ? 'CANCELLED'
          : b.status === BookingStatus.COMPLETED
            ? 'CONFIRMED'
            : 'CONFIRMED';

      lines.push('BEGIN:VEVENT');
      lines.push(this.foldLine(`UID:booking-${b.id}@yapgitsin.tr`));
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART:${this.fmtUtc(start)}`);
      lines.push(`DTEND:${this.fmtUtc(end)}`);
      lines.push(this.foldLine(`SUMMARY:${summary}`));
      if (description) lines.push(this.foldLine(`DESCRIPTION:${description}`));
      if (location) lines.push(this.foldLine(`LOCATION:${location}`));
      lines.push(`STATUS:${icsStatus}`);
      lines.push('TRANSP:OPAQUE');
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }
}
