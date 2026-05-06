import { BookingsService } from './bookings.service';
import { BookingStatus } from './booking.entity';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
export declare class BookingsController {
    private readonly svc;
    constructor(svc: BookingsService);
    create(req: AuthenticatedRequest, body: {
        workerId: string;
        category?: string;
        subCategory?: string;
        description?: string;
        address?: string;
        scheduledDate?: string;
        scheduledTime?: string;
        customerNote?: string;
    }): Promise<import("./booking.entity").Booking>;
    myAsCustomer(req: AuthenticatedRequest, page?: string, limit?: string): Promise<{
        data: import("./booking.entity").Booking[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    myAsWorker(req: AuthenticatedRequest, page?: string, limit?: string): Promise<{
        data: import("./booking.entity").Booking[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    findOne(id: string, req: AuthenticatedRequest): Promise<import("./booking.entity").Booking>;
    updateStatus(id: string, req: AuthenticatedRequest, body: {
        status: BookingStatus;
        note?: string;
    }): Promise<import("./booking.entity").Booking>;
}
