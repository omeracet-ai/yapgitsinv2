import { Repository } from 'typeorm';
import { User } from './user.entity';
import { DataDeletionRequest, DataDeletionRequestStatus } from './data-deletion-request.entity';
import { Job } from '../jobs/job.entity';
import { Offer } from '../jobs/offer.entity';
import { Review } from '../reviews/review.entity';
import { Booking } from '../bookings/booking.entity';
import { Notification } from '../notifications/notification.entity';
import { ChatMessage } from '../chat/chat-message.entity';
import { TokenTransaction } from '../tokens/token-transaction.entity';
export declare class DataPrivacyService {
    private users;
    private deletionRequests;
    private jobs;
    private offers;
    private reviews;
    private bookings;
    private notifications;
    private chatMessages;
    private tokenTransactions;
    constructor(users: Repository<User>, deletionRequests: Repository<DataDeletionRequest>, jobs: Repository<Job>, offers: Repository<Offer>, reviews: Repository<Review>, bookings: Repository<Booking>, notifications: Repository<Notification>, chatMessages: Repository<ChatMessage>, tokenTransactions: Repository<TokenTransaction>);
    exportUserData(userId: string): Promise<Record<string, unknown>>;
    createDeletionRequest(userId: string, reason: string | null): Promise<DataDeletionRequest>;
    listDeletionRequests(status?: DataDeletionRequestStatus): Promise<DataDeletionRequest[]>;
    moderateDeletionRequest(id: string, action: 'approve' | 'reject', adminId: string, adminNote?: string): Promise<DataDeletionRequest>;
    executeDeletion(id: string, adminId: string): Promise<{
        deleted: true;
        userId: string;
    }>;
}
