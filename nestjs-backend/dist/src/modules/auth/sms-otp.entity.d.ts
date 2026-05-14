export declare class SmsOtp {
    id: string;
    phoneNumber: string;
    code: string;
    expiresAt: Date;
    attempts: number;
    used: boolean;
    createdAt: Date;
}
