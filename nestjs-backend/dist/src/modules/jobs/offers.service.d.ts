import { DataSource, Repository } from 'typeorm';
import { Offer, OfferStatus } from './offer.entity';
import { Job } from './job.entity';
import { TokensService } from '../tokens/tokens.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EscrowService } from '../escrow/escrow.service';
import { UserBlocksService } from '../user-blocks/user-blocks.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
export declare class OffersService {
    private offersRepository;
    private jobsRepository;
    private tokensService;
    private usersService;
    private notificationsService;
    private escrowService;
    private userBlocksService;
    private subscriptionsService;
    private dataSource;
    private readonly logger;
    constructor(offersRepository: Repository<Offer>, jobsRepository: Repository<Job>, tokensService: TokensService, usersService: UsersService, notificationsService: NotificationsService, escrowService: EscrowService, userBlocksService: UserBlocksService, subscriptionsService: SubscriptionsService, dataSource: DataSource);
    withdrawOffer(jobId: string, offerId: string, userId: string): Promise<{
        id: string;
        status: OfferStatus;
        refunded: boolean;
        refundAmount: number;
    }>;
    findByJob(jobId: string): Promise<Offer[]>;
    findByUser(userId: string, page?: number, limit?: number): Promise<{
        data: Offer[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    findByProvider(userId: string): Promise<Offer[]>;
    findOffersByCustomer(customerId: string): Promise<Offer[]>;
    create(data: {
        jobId: string;
        userId: string;
        price: number;
        message?: string;
        attachmentUrls?: string[];
        lineItems?: Array<{
            label: string;
            qty: number;
            unitPrice: number;
            total: number;
        }>;
    }): Promise<Offer>;
    private _assertLineItemsMatchPrice;
    private _sanitizeAttachments;
    accept(offerId: string, _requestUserId: string): Promise<Offer>;
    reject(offerId: string): Promise<Offer>;
    counter(offerId: string, byUserId: string, counterPrice: number, counterMessage: string, lineItems?: Array<{
        label: string;
        qty: number;
        unitPrice: number;
        total: number;
    }>): Promise<Offer>;
    getNegotiationChain(offerId: string): Promise<Offer[]>;
    updateStatus(id: string, status: OfferStatus): Promise<Offer>;
    private _getOffer;
}
