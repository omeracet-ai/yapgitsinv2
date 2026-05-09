import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Booking, BookingStatus } from '../bookings/booking.entity';
import { Notification, NotificationType } from '../notifications/notification.entity';

@Injectable()
export class BookingReminderService {
  private readonly logger = new Logger(BookingReminderService.name);

  constructor(
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
  ) {}

  // Booking.scheduledDate is YYYY-MM-DD (string), scheduledTime is HH:MM (nullable).
  // We can't do a SQL Between on string+string easily, so we fetch upcoming
  // confirmed/in_progress bookings (next 48h window) and filter in JS.
  private parseScheduled(b: Booking): number {
    const time = b.scheduledTime ?? '09:00';
    // Treat as local time; Date constructor handles "YYYY-MM-DDTHH:MM"
    const dt = new Date(`${b.scheduledDate}T${time}:00`);
    return dt.getTime();
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async sendReminders(): Promise<void> {
    const now = Date.now();
    const horizonMs = 26 * 60 * 60 * 1000; // 26h ahead

    // Pull confirmed/in_progress bookings whose schedule may fall in next 26h
    // (string date filter — today + tomorrow + day after to be safe)
    const today = new Date(now);
    const dates: string[] = [];
    for (let i = 0; i <= 2; i++) {
      const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      dates.push(d.toISOString().slice(0, 10));
    }

    const candidates = await this.bookingRepo.find({
      where: {
        status: In([BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]),
        scheduledDate: In(dates),
      },
      relations: ['customer', 'worker'],
    });

    let sent24 = 0;
    let sent1 = 0;
    const nowDate = new Date();

    for (const b of candidates) {
      const sched = this.parseScheduled(b);
      if (Number.isNaN(sched)) continue;
      const deltaMs = sched - now;

      // 24h window: between 23h and 25h before
      const in24h = deltaMs >= 23 * 3600 * 1000 && deltaMs <= 25 * 3600 * 1000;
      // 1h window: between 45min and 75min before
      const in1h = deltaMs >= 45 * 60 * 1000 && deltaMs <= 75 * 60 * 1000;

      if (in24h && !b.reminder24hSentAt) {
        await this.dispatch(b, '24h');
        b.reminder24hSentAt = nowDate;
        await this.bookingRepo.save(b);
        sent24++;
      } else if (in1h && !b.reminder1hSentAt) {
        await this.dispatch(b, '1h');
        b.reminder1hSentAt = nowDate;
        await this.bookingRepo.save(b);
        sent1++;
      }

      // unused horizon kept for future tuning
      void horizonMs;
      void IsNull;
    }

    this.logger.log(
      `[BookingReminder] checked ${candidates.length} bookings, sent ${sent24} (24h) + ${sent1} (1h)`,
    );
  }

  private async dispatch(b: Booking, kind: '24h' | '1h'): Promise<void> {
    const customerName = b.customer?.fullName ?? 'Müşteri';
    const workerName = b.worker?.fullName ?? 'Usta';
    const time = b.scheduledTime ?? '';
    const when = kind === '24h' ? 'Yarın' : '1 saat sonra';
    const prefix = kind === '24h' ? '📅' : '⏰';

    const customerNotif = this.notifRepo.create({
      userId: b.customerId,
      type: NotificationType.BOOKING_CONFIRMED,
      title: `${prefix} Randevu Hatırlatması`,
      body: `${when} ${workerName} ile randevun var: ${b.category}${time ? `, ${time}` : ''}`,
      refId: b.id,
      relatedType: 'booking',
      relatedId: b.id,
    });
    const workerNotif = this.notifRepo.create({
      userId: b.workerId,
      type: NotificationType.BOOKING_CONFIRMED,
      title: `${prefix} Randevu Hatırlatması`,
      body: `${when} ${customerName} için iş: ${b.category}${time ? `, ${time}` : ''}`,
      refId: b.id,
      relatedType: 'booking',
      relatedId: b.id,
    });
    await this.notifRepo.save([customerNotif, workerNotif]);
  }
}
