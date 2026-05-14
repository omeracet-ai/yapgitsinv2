import { Repository } from 'typeorm';
import { Booking } from '../bookings/booking.entity';
import { Payment, PaymentStatus, PaymentMethod } from './payment.entity';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { PaymentHistoryQueryDto } from './dto/payment-history.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { NotificationsService } from '../notifications/notifications.service';
export declare class PaymentsService {
    private bookingRepository;
    private paymentRepository;
    private notificationsService;
    private iyzipay;
    private useStripe;
    private stripeApiKey;
    private readonly logger;
    constructor(bookingRepository: Repository<Booking>, paymentRepository: Repository<Payment>, notificationsService: NotificationsService);
    createPaymentIntent(customerId: string, dto: CreatePaymentIntentDto): Promise<{
        paymentId: string;
        paymentIntentId: string | null;
        status: PaymentStatus;
        amountMinor: number;
        currency: string;
        method: PaymentMethod;
    }>;
    confirmPayment(customerId: string, dto: ConfirmPaymentDto): Promise<{
        paymentId: string;
        status: PaymentStatus.PROCESSING | PaymentStatus.COMPLETED;
        externalTransactionId: string | null;
        completedAt: Date | null;
    }>;
    getPaymentHistory(userId: string, queryDto: PaymentHistoryQueryDto, isWorker?: boolean): Promise<{
        payments: {
            id: string;
            customerId: string;
            workerId: string;
            bookingId: string | null;
            amountMinor: number;
            currency: string;
            status: PaymentStatus;
            method: PaymentMethod;
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
    getWorkerEarnings(workerId: string): Promise<{
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
    refundPayment(customerId: string, dto: RefundPaymentDto): Promise<{
        paymentId: string;
        refundId: string;
        amountRefunded: number;
        status: PaymentStatus.COMPLETED | PaymentStatus.REFUNDED;
    }>;
    createCheckoutForm(data: {
        price: string;
        paidPrice: string;
        basketId: string;
        user: any;
    }): Promise<unknown>;
    retrieveCheckoutResult(token: string): Promise<unknown>;
    handlePaymentWebhook(event: any): Promise<void>;
}
