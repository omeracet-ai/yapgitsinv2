import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PromoService } from './promo.service';
import type { AdminCreatePromoDto, AdminUpdatePromoDto } from './promo.service';
interface AuthedReq {
    user?: {
        id?: string;
        sub?: string;
        userId?: string;
    };
}
export declare class PromoController {
    private readonly svc;
    private readonly audit;
    constructor(svc: PromoService, audit: AdminAuditService);
    validate(code: string, spend: string | undefined, req: AuthedReq): Promise<import("./promo.service").PromoValidationResult>;
    validateByPath(code: string, req: AuthedReq): Promise<{
        valid: boolean;
        discount: number;
        type: "percent" | "fixed";
        description: string;
    }>;
    applyByPath(code: string, req: AuthedReq): Promise<{
        success: boolean;
        tokensAdded: number | undefined;
    }>;
    redeem(body: {
        code: string;
    }, req: AuthedReq): Promise<import("./promo.service").RedeemEffectResult>;
    adminList(page?: string, limit?: string): Promise<{
        data: import("./promo-code.entity").PromoCode[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    adminCreate(body: AdminCreatePromoDto, req: AuthedReq): Promise<import("./promo-code.entity").PromoCode>;
    adminUpdate(id: string, body: AdminUpdatePromoDto, req: AuthedReq): Promise<import("./promo-code.entity").PromoCode>;
    adminDelete(id: string, req: AuthedReq): Promise<{
        success: true;
    }>;
}
export {};
