import { DataSource, Repository } from 'typeorm';
import { Booking, BookingStatus, CancellationReason, RefundStatus } from './booking.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AvailabilityService } from '../availability/availability.service';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { BookingEscrowService } from '../escrow/booking-escrow.service';
export declare class BookingsService {
    private repo;
    private usersService;
    private notificationsService;
    private availabilityService;
    private dataSource;
    private auditService;
    private escrowService;
    private readonly logger;
    constructor(repo: Repository<Booking>, usersService: UsersService, notificationsService: NotificationsService, availabilityService: AvailabilityService, dataSource: DataSource, auditService: AdminAuditService, escrowService: BookingEscrowService);
    private _computeRefund;
    cancelBooking(bookingId: string, userId: string, reason: CancellationReason): Promise<{
        status: BookingStatus;
        refundAmount: number;
        refundStatus: RefundStatus;
        refundPercent: number;
        booking: Booking;
    }>;
    private _parseScheduled;
    create(customerId: string, data: {
        workerId: string;
        category: string;
        subCategory?: string;
        description: string;
        address: string;
        scheduledDate: string;
        scheduledTime?: string;
        customerNote?: string;
    }): Promise<Booking>;
    updateStatus(id: string, actorId: string, status: BookingStatus, note?: string): Promise<Booking>;
    findByCustomer(customerId: string, page?: number, limit?: number): Promise<{
        data: Booking[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    findByWorker(workerId: string, page?: number, limit?: number): Promise<{
        data: Booking[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    findOne(id: string, actorId: string): Promise<Booking>;
    private _notifyStatusChange;
    exportIcs(workerId: string): Promise<string>;
    private _toIcsDate;
    private _bookingStartDate;
}
