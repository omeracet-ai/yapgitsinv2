export declare class SmsService {
    private readonly logger;
    sendSms(to: string, message: string): Promise<{
        success: boolean;
        provider?: string;
        error?: string;
    }>;
    private normalizePhone;
    private toE164;
}
