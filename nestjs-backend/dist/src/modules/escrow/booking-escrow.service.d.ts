import { DataSource, Repository } from 'typeorm';
import { BookingEscrow } from './booking-escrow.entity';
export declare class BookingEscrowService {
    private readonly repo;
    private readonly dataSource;
    constructor(repo: Repository<BookingEscrow>, dataSource: DataSource);
    hold(bookingId: string, customerId: string, workerId: string, amount: number): Promise<BookingEscrow>;
    release(bookingId: string, actorId: string): Promise<BookingEscrow>;
    refund(bookingId: string, percent: number, actorId?: string): Promise<BookingEscrow | null>;
    getByBooking(bookingId: string, requesterId: string): Promise<BookingEscrow | null>;
}
