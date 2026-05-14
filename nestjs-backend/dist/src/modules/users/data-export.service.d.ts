import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Booking } from '../bookings/booking.entity';
import { Payment } from '../payments/payment.entity';
import { PaymentEscrow } from '../escrow/payment-escrow.entity';
import { Review } from '../reviews/review.entity';
import { ChatMessage } from '../chat/chat-message.entity';
import { Notification } from '../notifications/notification.entity';
import { JobLead } from '../leads/job-lead.entity';
import { JobLeadResponse } from '../leads/job-lead-response.entity';
export declare class DataExportService {
    private readonly users;
    private readonly bookings;
    private readonly payments;
    private readonly escrows;
    private readonly reviews;
    private readonly chats;
    private readonly notifications;
    private readonly jobLeads;
    private readonly leadResponses;
    constructor(users: Repository<User>, bookings: Repository<Booking>, payments: Repository<Payment>, escrows: Repository<PaymentEscrow>, reviews: Repository<Review>, chats: Repository<ChatMessage>, notifications: Repository<Notification>, jobLeads: Repository<JobLead>, leadResponses: Repository<JobLeadResponse>);
    private sanitizeUser;
    exportForUser(userId: string): Promise<object>;
}
