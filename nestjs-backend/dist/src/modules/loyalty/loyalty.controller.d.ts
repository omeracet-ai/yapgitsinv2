import { LoyaltyService } from './loyalty.service';
interface AuthedReq {
    user?: {
        id?: string;
        sub?: string;
        userId?: string;
    };
}
export declare class LoyaltyController {
    private readonly svc;
    constructor(svc: LoyaltyService);
    getMy(req: AuthedReq): Promise<import("./loyalty.service").LoyaltyInfo>;
    redeem(req: AuthedReq, body: {
        code: string;
    }): Promise<{
        success: boolean;
        bonusTokens: number;
    }>;
}
export {};
