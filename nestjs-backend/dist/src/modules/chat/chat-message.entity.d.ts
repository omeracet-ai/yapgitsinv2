export declare class ChatMessage {
    id: string;
    tenantId: string | null;
    from: string;
    to: string;
    message: string;
    jobId: string | null;
    jobLeadId: string | null;
    bookingId: string | null;
    flagged: boolean;
    flagReason: string | null;
    createdAt: Date;
    readAt: Date | null;
    deliveryStatus: 'sent' | 'delivered' | 'failed';
    deliveryFailureReason: string | null;
    attachmentUrl: string | null;
    attachmentType: 'image' | 'document' | 'audio' | null;
    attachmentName: string | null;
    attachmentSize: number | null;
    attachmentDuration: number | null;
    translatedText: {
        tr?: string;
        en?: string;
        az?: string;
    } | null;
}
