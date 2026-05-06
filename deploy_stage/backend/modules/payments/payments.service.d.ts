import { Repository } from 'typeorm';
import { Booking } from '../bookings/booking.entity';
export declare class PaymentsService {
    private bookingRepository;
    private iyzipay;
    constructor(bookingRepository: Repository<Booking>);
    getEarnings(workerId: string): Promise<{
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
    createCheckoutForm(data: {
        price: string;
        paidPrice: string;
        basketId: string;
        user: any;
    }): Promise<unknown>;
    retrieveCheckoutResult(token: string): Promise<unknown>;
}
