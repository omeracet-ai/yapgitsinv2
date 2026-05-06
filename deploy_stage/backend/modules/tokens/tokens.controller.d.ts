import { TokensService } from './tokens.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
export declare class TokensController {
    private readonly svc;
    constructor(svc: TokensService);
    getBalance(req: AuthenticatedRequest): Promise<{
        balance: number;
    }>;
    getHistory(req: AuthenticatedRequest): Promise<import("./token-transaction.entity").TokenTransaction[]>;
    purchase(req: AuthenticatedRequest, body: {
        amount: number;
        paymentMethod: 'bank' | 'crypto';
    }): Promise<import("./token-transaction.entity").TokenTransaction>;
}
