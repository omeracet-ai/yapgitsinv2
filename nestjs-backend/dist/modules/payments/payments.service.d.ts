export declare class PaymentsService {
    private iyzipay;
    constructor();
    createCheckoutForm(data: {
        price: string;
        paidPrice: string;
        basketId: string;
        user: any;
    }): Promise<unknown>;
    retrieveCheckoutResult(token: string): Promise<unknown>;
}
