import type { Response } from 'express';
import { WalletService } from './wallet.service';
export declare class WalletController {
    private readonly svc;
    constructor(svc: WalletService);
    getPdf(req: any, res: Response): Promise<void>;
}
