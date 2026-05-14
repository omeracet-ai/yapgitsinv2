import { Repository } from 'typeorm';
import { Payment } from '../payments/payment.entity';
import { PaymentEscrow } from '../escrow/payment-escrow.entity';
import { User } from './user.entity';
export declare class WalletService {
    private readonly paymentRepo;
    private readonly escrowRepo;
    private readonly userRepo;
    private readonly BRAND_ORANGE;
    private readonly BRAND_NAVY;
    constructor(paymentRepo: Repository<Payment>, escrowRepo: Repository<PaymentEscrow>, userRepo: Repository<User>);
    generatePdf(userId: string): Promise<Buffer>;
    private renderPdf;
    private fmtDate;
    private fmtTl;
}
