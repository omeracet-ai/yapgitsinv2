export interface CheckoutFormResult {
    token: string;
    paymentPageUrl: string | null;
    checkoutFormContent: string | null;
    mock: boolean;
}
export interface RetrieveResult {
    status: 'SUCCESS' | 'FAILURE';
    paymentId: string | null;
    paymentTransactionId: string | null;
    raw?: any;
}
export interface RefundResult {
    status: 'success' | 'failure';
    refundId: string | null;
    error?: string;
}
interface CreateCheckoutArgs {
    refId: string;
    gross: number;
    callbackUrl: string;
    buyer?: {
        id?: string;
        name?: string;
        surname?: string;
        email?: string;
        gsmNumber?: string;
        identityNumber?: string;
        ip?: string;
        city?: string;
        country?: string;
        address?: string;
        zipCode?: string;
    };
    itemName?: string;
}
export declare class IyzipayService {
    private readonly logger;
    private client;
    readonly mockMode: boolean;
    constructor();
    static callbackUrl(): string;
    createCheckoutForm(args: CreateCheckoutArgs): Promise<CheckoutFormResult>;
    retrieveCheckout(token: string): Promise<RetrieveResult>;
    refund(args: {
        paymentTransactionId: string;
        price: number;
        ip?: string;
    }): Promise<RefundResult>;
}
export {};
