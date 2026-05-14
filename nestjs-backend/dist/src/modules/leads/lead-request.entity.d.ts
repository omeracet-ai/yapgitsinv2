export type LeadStatus = 'new' | 'contacted' | 'converted' | 'spam';
export type LeadSource = 'landing' | 'category' | 'worker_profile' | 'job_detail';
export declare class LeadRequest {
    id: string;
    name: string;
    phoneNumber: string;
    email: string | null;
    message: string;
    category: string | null;
    targetWorkerId: string | null;
    source: LeadSource;
    status: LeadStatus;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    contactedAt: Date | null;
    notes: string | null;
}
