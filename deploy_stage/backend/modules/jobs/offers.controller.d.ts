import { OffersService } from './offers.service';
import { OfferStatus } from './offer.entity';
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
    create(jobId: string, body: {
        price: number;
        message?: string;
    }, req: AuthenticatedRequest): Promise<import("./offer.entity").Offer>;
    accept(id: string, req: AuthenticatedRequest): Promise<import("./offer.entity").Offer>;
    reject(id: string): Promise<import("./offer.entity").Offer>;
    counter(id: string, body: {
        counterPrice: number;
        counterMessage: string;
    }): Promise<import("./offer.entity").Offer>;
    updateStatus(id: string, body: {
        status: OfferStatus;
    }): Promise<import("./offer.entity").Offer>;
}
