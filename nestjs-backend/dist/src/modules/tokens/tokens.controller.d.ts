import type { Response } from 'express';
import { TokensService } from './tokens.service';
import { WalletPdfService } from './wallet-pdf.service';
import { GiftTokensDto } from './dto/gift-tokens.dto';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
export declare class TokensController {
    private readonly svc;
    private readonly pdfSvc;
    constructor(svc: TokensService, pdfSvc: WalletPdfService);
    historyPdf(req: AuthenticatedRequest, from: string | undefined, to: string | undefined, res: Response): Promise<void>;
    getBalance(req: AuthenticatedRequest): Promise<{
        balance: number;
    }>;
    getHistory(req: AuthenticatedRequest): Promise<import("./token-transaction.entity").TokenTransaction[]>;
    purchase(req: AuthenticatedRequest, body: {
        amount: number;
        paymentMethod: 'bank' | 'crypto';
    }): Promise<import("./token-transaction.entity").TokenTransaction>;
    gift(req: AuthenticatedRequest, dto: GiftTokensDto): Promise<{
        senderBalance: number;
        recipientBalance: number;
        amount: number;
        recipientName: string;
    }>;
}
