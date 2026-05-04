import { Repository } from 'typeorm';
import { Booking, BookingStatus } from './booking.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class BookingsService {
    private repo;
    private usersService;
    private notificationsService;
    constructor(repo: Repository<Booking>, usersService: UsersService, notificationsService: NotificationsService);
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
    findByCustomer(customerId: string): Promise<Booking[]>;
    findByWorker(workerId: string): Promise<Booking[]>;
    findOne(id: string, actorId: string): Promise<Booking>;
    private _notifyStatusChange;
}
