import { Repository } from 'typeorm';
import { PaymentEscrow } from '../escrow/payment-escrow.entity';
export interface LineItem {
    date: Date;
    jobId: string;
    role: 'customer' | 'tasker';
    amount: number;
    commission: number;
    net: number;
    status: string;
}
export interface MonthlyStatement {
    period: {
        year: number;
        month: number;
    };
    asCustomer: {
        count: number;
        totalSpent: number;
    };
    asTasker: {
        count: number;
        totalGross: number;
        totalCommission: number;
        totalNet: number;
    };
    lineItems: LineItem[];
}
export declare class StatementsService {
    private readonly escrowRepo;
    constructor(escrowRepo: Repository<PaymentEscrow>);
    getMonthly(userId: string, year: number, month: number): Promise<MonthlyStatement>;
    getMonthlyCsv(userId: string, year: number, month: number): Promise<string>;
}
