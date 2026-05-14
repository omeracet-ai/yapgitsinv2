export declare class CreateLeadDto {
    name: string;
    phoneNumber: string;
    email?: string;
    message: string;
    category?: string;
    targetWorkerId?: string;
    source?: 'landing' | 'category' | 'worker_profile' | 'job_detail';
    website?: string;
}
