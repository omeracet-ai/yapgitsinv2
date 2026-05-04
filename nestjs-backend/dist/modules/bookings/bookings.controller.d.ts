import { BookingsService } from './bookings.service';
import { BookingStatus } from './booking.entity';
export declare class BookingsController {
    private readonly svc;
    constructor(svc: BookingsService);
    create(req: any, body: any): Promise<import("./booking.entity").Booking>;
    myAsCustomer(req: any): Promise<import("./booking.entity").Booking[]>;
    myAsWorker(req: any): Promise<import("./booking.entity").Booking[]>;
    findOne(id: string, req: any): Promise<import("./booking.entity").Booking>;
    updateStatus(id: string, req: any, body: {
        status: BookingStatus;
        note?: string;
    }): Promise<import("./booking.entity").Booking>;
}
