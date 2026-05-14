import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Booking } from '../bookings/booking.entity';
export declare class CalendarSyncService {
    private readonly users;
    private readonly bookings;
    constructor(users: Repository<User>, bookings: Repository<Booking>);
    private buildUrl;
    enable(userId: string): Promise<{
        calendarUrl: string;
        token: string;
    }>;
    regenerate(userId: string): Promise<{
        calendarUrl: string;
        token: string;
    }>;
    disable(userId: string): Promise<{
        ok: true;
    }>;
    private esc;
    private fmtDt;
    private fold;
    generateIcs(userId: string, token: string): Promise<string | null>;
}
