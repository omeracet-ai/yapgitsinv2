import { OnModuleInit } from '@nestjs/common';
interface MailUser {
    id?: string;
    email?: string | null;
    fullName?: string | null;
}
interface MailBooking {
    id: string;
    category?: string | null;
    scheduledDate?: string | null;
    scheduledTime?: string | null;
    address?: string | null;
    agreedPrice?: number | null;
}
interface MailJob {
    id: string;
    title: string;
}
interface MailOffer {
    id: string;
    price: number;
}
export declare class EmailService implements OnModuleInit {
    private readonly logger;
    private transporter;
    private from;
    onModuleInit(): void;
    send(to: string, subject: string, html: string, text?: string): Promise<void>;
    sendWelcome(user: MailUser): Promise<void>;
    sendBookingConfirmed(user: MailUser, booking: MailBooking): Promise<void>;
    sendOfferAccepted(worker: MailUser, customer: MailUser, job: MailJob, offer: MailOffer): Promise<void>;
    sendOfferRejected(worker: MailUser, job: MailJob, _offer: MailOffer): Promise<void>;
    sendPasswordReset(user: MailUser, resetToken: string): Promise<void>;
    sendJobLeadNotification(worker: MailUser, leadInfo: {
        id: string;
        category: string;
        city: string;
        description?: string;
        budgetMin?: number;
        budgetMax?: number;
        requesterName: string;
    }): Promise<void>;
    sendLeadConfirmation(customer: MailUser, leadInfo: {
        category: string;
        city: string;
    }): Promise<void>;
}
export {};
