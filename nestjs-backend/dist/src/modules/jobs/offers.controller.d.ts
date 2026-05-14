import { OffersService } from './offers.service';
import { OfferStatus } from './offer.entity';
import { CreateOfferDto, CounterOfferDto } from './dto/offer.dto';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
export declare class OffersRootController {
    private readonly offersService;
    constructor(offersService: OffersService);
    getMyOffers(req: AuthenticatedRequest, page?: string, limit?: string): Promise<{
        data: import("./offer.entity").Offer[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
}
export declare class OffersController {
    private readonly offersService;
    constructor(offersService: OffersService);
    findByJob(jobId: string): Promise<import("./offer.entity").Offer[]>;
    create(jobId: string, body: CreateOfferDto, req: AuthenticatedRequest): Promise<import("./offer.entity").Offer>;
    accept(id: string, req: AuthenticatedRequest): Promise<import("./offer.entity").Offer>;
    reject(id: string): Promise<import("./offer.entity").Offer>;
    counter(id: string, body: CounterOfferDto, req: AuthenticatedRequest): Promise<import("./offer.entity").Offer>;
    getChain(id: string): Promise<import("./offer.entity").Offer[]>;
    withdraw(jobId: string, offerId: string, req: AuthenticatedRequest): Promise<{
        id: string;
        status: OfferStatus;
        refunded: boolean;
        refundAmount: number;
    }>;
    updateStatus(id: string, body: {
        status: OfferStatus;
    }): Promise<import("./offer.entity").Offer>;
}
