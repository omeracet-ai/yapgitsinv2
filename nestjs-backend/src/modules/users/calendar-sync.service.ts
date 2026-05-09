import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { randomUUID } from 'crypto';
import { User } from './user.entity';
import { Booking, BookingStatus } from '../bookings/booking.entity';

/**
 * Phase 155 — Worker Calendar ICS Feed.
 * Universal subscribe URL (Google / Apple / Outlook compatible).
 * Public-by-token: URL contains a uuid token; rotating it breaks old subscriptions.
 */
@Injectable()
export class CalendarSyncService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
  ) {}

  private buildUrl(userId: string, token: string): string {
    const base = process.env.PUBLIC_BASE_URL || 'https://yapgitsin.tr';
    return `${base.replace(/\/$/, '')}/users/${userId}/calendar.ics?token=${token}`;
  }

  async enable(userId: string): Promise<{ calendarUrl: string; token: string }> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    if (!user.calendarToken) {
      user.calendarToken = randomUUID();
      await this.users.save(user);
    }
    return { calendarUrl: this.buildUrl(user.id, user.calendarToken), token: user.calendarToken };
  }

  async regenerate(userId: string): Promise<{ calendarUrl: string; token: string }> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    user.calendarToken = randomUUID();
    await this.users.save(user);
    return { calendarUrl: this.buildUrl(user.id, user.calendarToken), token: user.calendarToken };
  }

  async disable(userId: string): Promise<{ ok: true }> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    user.calendarToken = null;
    await this.users.save(user);
    return { ok: true };
  }

  /** Escape RFC 5545 TEXT field (commas, semicolons, backslashes, newlines). */
  private esc(s: string | null | undefined): string {
    if (!s) return '';
    return String(s)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  private fmtDt(d: Date): string {
    // YYYYMMDDTHHMMSSZ (UTC)
    const pad = (n: number) => String(n).padStart(2, '0');
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

  /** RFC 5545 line folding: lines >75 octets are split with CRLF + space. */
  private fold(line: string): string {
    if (line.length <= 75) return line;
    const out: string[] = [];
    let rest = line;
    out.push(rest.slice(0, 75));
    rest = rest.slice(75);
    while (rest.length > 74) {
      out.push(' ' + rest.slice(0, 74));
      rest = rest.slice(74);
    }
    if (rest.length > 0) out.push(' ' + rest);
    return out.join('\r\n');
  }

  /** Verify token, fetch upcoming bookings, return iCalendar string. */
  async generateIcs(userId: string, token: string): Promise<string | null> {
    if (!token) return null;
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || !user.calendarToken || user.calendarToken !== token) return null;

    const todayStr = new Date().toISOString().slice(0, 10);
    const bookings = await this.bookings.find({
      where: {
        workerId: userId,
        status: In([
          BookingStatus.PENDING,
          BookingStatus.CONFIRMED,
          BookingStatus.IN_PROGRESS,
        ]),
      },
      order: { scheduledDate: 'ASC' },
    });
    const upcoming = bookings.filter((b) => (b.scheduledDate || '') >= todayStr);

    // Pre-fetch customer names for SUMMARY
    const customerIds = Array.from(new Set(upcoming.map((b) => b.customerId)));
    const customers = customerIds.length
      ? await this.users.find({ where: { id: In(customerIds) }, select: ['id', 'fullName'] })
      : [];
    const nameById = new Map(customers.map((c) => [c.id, c.fullName]));

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Yapgitsin//TR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Yapgitsin Randevular',
      'X-WR-TIMEZONE:Europe/Istanbul',
    ];

    const dtstamp = this.fmtDt(new Date());

    for (const b of upcoming) {
      // scheduledDate=YYYY-MM-DD; scheduledTime=HH:MM (TR = UTC+3); default 09:00 if missing
      const [y, m, d] = (b.scheduledDate || '').split('-').map((s) => parseInt(s, 10));
      if (!y || !m || !d) continue;
      const [hh, mm] = (b.scheduledTime || '09:00').split(':').map((s) => parseInt(s, 10));
      const startLocal = new Date(Date.UTC(y, m - 1, d, (hh || 9) - 3, mm || 0, 0));
      const endLocal = new Date(startLocal.getTime() + 60 * 60 * 1000);

      const customerName = nameById.get(b.customerId) || 'Müşteri';
      const summary = `${customerName} — ${b.category}`;
      const status =
        b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.IN_PROGRESS
          ? 'CONFIRMED'
          : 'TENTATIVE';

      lines.push('BEGIN:VEVENT');
      lines.push(this.fold(`UID:booking-${b.id}@yapgitsin.tr`));
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART:${this.fmtDt(startLocal)}`);
      lines.push(`DTEND:${this.fmtDt(endLocal)}`);
      lines.push(this.fold(`SUMMARY:${this.esc(summary)}`));
      if (b.description) {
        lines.push(this.fold(`DESCRIPTION:${this.esc(b.description)}`));
      }
      if (b.address) {
        lines.push(this.fold(`LOCATION:${this.esc(b.address)}`));
      }
      lines.push(`STATUS:${status}`);
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }
}
