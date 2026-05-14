import { User } from '../users/user.entity';
import { JobLeadResponse } from './job-lead-response.entity';
export type JobLeadStatus = 'open' | 'in_progress' | 'closed' | 'expired';
export declare class JobLead {
    id: string;
    customerId: string | null;
    category: string;
    city: string;
    description: string | null;
    budgetMin: number | null;
    budgetMax: number | null;
    budgetVisible: boolean;
    requesterName: string;
    requesterPhone: string;
    requesterEmail: string;
    preferredContactTime: 'today' | 'this_week' | 'flexible';
    status: JobLeadStatus;
    attachments: string | null;
    createdAt: Date;
    updatedAt: Date;
    customer: User | null;
    responses: JobLeadResponse[];
}
