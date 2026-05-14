import { JobLead } from './job-lead.entity';
import { User } from '../users/user.entity';
export type JobLeadResponseStatus = 'sent_email' | 'viewed' | 'contacted' | 'accepted' | 'rejected';
export declare class JobLeadResponse {
    id: string;
    leadId: string;
    workerId: string;
    status: JobLeadResponseStatus;
    workerMessage: string | null;
    respondedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    lead: JobLead;
    worker: User;
}
