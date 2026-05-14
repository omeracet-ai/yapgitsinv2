import { Repository } from 'typeorm';
import { Booking } from '../bookings/booking.entity';
import { Notification } from '../notifications/notification.entity';
export declare class BookingReminderService {
    private readonly bookingRepo;
    private readonly notifRepo;
    private readonly logger;
    constructor(bookingRepo: Repository<Booking>, notifRepo: Repository<Notification>);
    private parseScheduled;
    sendReminders(): Promise<void>;
    private dispatch;
}
