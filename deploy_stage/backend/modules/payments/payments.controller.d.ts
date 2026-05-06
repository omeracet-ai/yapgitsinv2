import type { Response } from 'express';
import { PaymentsService } from './payments.service';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    getEarnings(req: any): Promise<{
        totalEarnings: number;
        monthlyEarnings: number;
        weeklyEarnings: number;
        completedCount: number;
        lastTransactions: {
            id: string;
            amount: number | null;
            date: Date;
            category: string;
        }[];
    }>;
    createSession(body: any): Promise<unknown>;
    callback(body: Record<string, string>, res: Response): Promise<void>;
}
