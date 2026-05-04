import { TokensService } from './tokens.service';
export declare class TokensController {
    private readonly svc;
    constructor(svc: TokensService);
    getBalance(req: any): Promise<{
        balance: number;
    }>;
    getHistory(req: any): Promise<import("./token-transaction.entity").TokenTransaction[]>;
    purchase(req: any, body: {
        amount: number;
        paymentMethod: 'bank' | 'crypto';
    }): Promise<import("./token-transaction.entity").TokenTransaction>;
}
