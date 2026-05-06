import { Repository } from 'typeorm';
import { Offer, OfferStatus } from './offer.entity';
import { TokensService } from '../tokens/tokens.service';
import { UsersService } from '../users/users.service';
export declare class OffersService {
    private offersRepository;
    private tokensService;
    private usersService;
    constructor(offersRepository: Repository<Offer>, tokensService: TokensService, usersService: UsersService);
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
    }): Promise<Offer>;
    accept(offerId: string, _requestUserId: string): Promise<Offer>;
    reject(offerId: string): Promise<Offer>;
    counter(offerId: string, counterPrice: number, counterMessage: string): Promise<Offer>;
    updateStatus(id: string, status: OfferStatus): Promise<Offer>;
    private _getOffer;
}
