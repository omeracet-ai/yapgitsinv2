export declare class CreateJobLeadDto {
    category: string;
    city: string;
    description?: string;
    budgetMin?: number;
    budgetMax?: number;
    budgetVisible?: boolean;
    requesterName: string;
    requesterPhone: string;
    requesterEmail: string;
    preferredContactTime?: 'today' | 'this_week' | 'flexible';
    attachments?: string[];
}
