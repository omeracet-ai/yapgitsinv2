import type { Response } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { PaymentHistoryQueryDto } from './dto/payment-history.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { EscrowService } from '../escrow/escrow.service';
export declare class PaymentsController {
    private readonly paymentsService;
    private readonly escrowService;
    constructor(paymentsService: PaymentsService, escrowService: EscrowService);
    createPaymentIntent(req: any, dto: CreatePaymentIntentDto): Promise<{
        paymentId: string;
        paymentIntentId: string | null;
        status: import("./payment.entity").PaymentStatus;
        amountMinor: number;
        currency: string;
        method: import("./payment.entity").PaymentMethod;
    }>;
    confirmPayment(req: any, dto: ConfirmPaymentDto): Promise<{
        paymentId: string;
        status: import("./payment.entity").PaymentStatus.PROCESSING | import("./payment.entity").PaymentStatus.COMPLETED;
        externalTransactionId: string | null;
        completedAt: Date | null;
    }>;
    getPaymentHistory(req: any, query: PaymentHistoryQueryDto): Promise<{
        payments: {
            id: string;
            customerId: string;
            workerId: string;
            bookingId: string | null;
            amountMinor: number;
            currency: string;
            status: import("./payment.entity").PaymentStatus;
            method: import("./payment.entity").PaymentMethod;
            externalTransactionId: string | null;
            description: string | null;
            createdAt: Date;
            completedAt: Date | null;
            errorMessage: string | null;
        }[];
        total: number;
        skip: number;
        take: number;
    }>;
    getEarnings(req: any): Promise<{
        totalEarnings: number;
        monthlyEarnings: number;
        weeklyEarnings: number;
        completedPaymentCount: number;
        completedBookingCount: number;
        lastTransactions: ({
            id: string;
            amount: number;
            date: Date | null;
            type: string;
            description: string | null;
        } | {
            id: string;
            amount: number | null;
            date: Date;
            type: string;
            description: string;
        })[];
    }>;
    refundPayment(req: any, dto: RefundPaymentDto): Promise<{
        paymentId: string;
        refundId: string;
        amountRefunded: number;
        status: import("./payment.entity").PaymentStatus.COMPLETED | import("./payment.entity").PaymentStatus.REFUNDED;
    }>;
    createSession(body: any): Promise<unknown>;
    callback(body: Record<string, string>, res: Response): Promise<void>;
    iyzipayCallback(body: Record<string, string>): Promise<{
        status: string;
        escrowId: string;
    }>;
    handleWebhook(event: any): Promise<{
        received: boolean;
    }>;
}
