export declare class OfferLineItemDto {
    label: string;
    qty: number;
    unitPrice: number;
    total: number;
}
export declare class CreateOfferDto {
    price: number;
    message?: string;
    attachmentUrls?: string[];
    lineItems?: OfferLineItemDto[];
}
export declare class CounterOfferDto {
    counterPrice: number;
    counterMessage: string;
    lineItems?: OfferLineItemDto[];
}
