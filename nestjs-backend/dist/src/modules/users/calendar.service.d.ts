import { Repository } from 'typeorm';
import { Booking } from '../bookings/booking.entity';
import { User } from './user.entity';
export declare class CalendarService {
    private readonly bookingRepo;
    private readonly userRepo;
    constructor(bookingRepo: Repository<Booking>, userRepo: Repository<User>);
    private generateToken;
    getOrCreateCalendarToken(userId: string): Promise<string>;
    rotateCalendarToken(userId: string): Promise<string>;
    revokeCalendarToken(userId: string): Promise<void>;
    findUserByCalendarToken(token: string): Promise<User | null>;
    findWorkerBookings(workerId: string): Promise<Booking[]>;
    private escapeText;
    private foldLine;
    private fmtUtc;
    private buildEventDates;
    generateIcs(bookings: Booking[]): string;
}
