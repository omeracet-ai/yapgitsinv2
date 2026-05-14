import { BookingEscrowService } from './booking-escrow.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
import { Booking } from '../bookings/booking.entity';
import { Repository } from 'typeorm';
export declare class BookingEscrowController {
    private readonly svc;
    private readonly bookingRepo;
    constructor(svc: BookingEscrowService, bookingRepo: Repository<Booking>);
    hold(body: {
        bookingId: string;
        amount: number;
    }, req: AuthenticatedRequest): Promise<import("./booking-escrow.entity").BookingEscrow>;
    release(bookingId: string, req: AuthenticatedRequest): Promise<import("./booking-escrow.entity").BookingEscrow>;
    getByBooking(bookingId: string, req: AuthenticatedRequest): Promise<import("./booking-escrow.entity").BookingEscrow>;
}
