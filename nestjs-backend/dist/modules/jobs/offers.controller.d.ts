import { OffersService } from './offers.service';
import { OfferStatus } from './offer.entity';
export declare class OffersRootController {
    private readonly offersService;
    constructor(offersService: OffersService);
    getMyOffers(req: any): Promise<import("./offer.entity").Offer[]>;
}
export declare class OffersController {
    private readonly offersService;
    constructor(offersService: OffersService);
    findByJob(jobId: string): Promise<import("./offer.entity").Offer[]>;
    create(jobId: string, body: {
        price: number;
        message?: string;
    }, req: any): Promise<import("./offer.entity").Offer>;
    accept(id: string, req: any): Promise<import("./offer.entity").Offer>;
    reject(id: string): Promise<import("./offer.entity").Offer>;
    counter(id: string, body: {
        counterPrice: number;
        counterMessage: string;
    }): Promise<import("./offer.entity").Offer>;
    updateStatus(id: string, body: {
        status: OfferStatus;
    }): Promise<import("./offer.entity").Offer>;
}
