import { Repository } from 'typeorm';
import { JobLead, JobLeadStatus } from './job-lead.entity';
import { JobLeadResponse, JobLeadResponseStatus } from './job-lead-response.entity';
import { CreateJobLeadDto } from './dto/create-job-lead.dto';
import { User } from '../users/user.entity';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class JobLeadsService {
    private readonly leadRepo;
    private readonly responseRepo;
    private readonly userRepo;
    private readonly emailService;
    private readonly notificationsService;
    private readonly logger;
    constructor(leadRepo: Repository<JobLead>, responseRepo: Repository<JobLeadResponse>, userRepo: Repository<User>, emailService: EmailService, notificationsService: NotificationsService);
    create(dto: CreateJobLeadDto, customerId?: string): Promise<{
        id: string;
        status: JobLeadStatus;
    }>;
    findById(id: string, includeResponses?: boolean): Promise<JobLead>;
    findByCustomerId(customerId: string, page?: number, limit?: number): Promise<{
        data: JobLead[];
        total: number;
        pages: number;
    }>;
    updateStatus(id: string, status: JobLeadStatus): Promise<JobLead>;
    matchWorkers(leadId: string): Promise<User[]>;
    recordResponse(leadId: string, workerId: string, status: JobLeadResponseStatus, message?: string): Promise<JobLeadResponse>;
    getLeadResponses(leadId: string): Promise<JobLeadResponse[]>;
    private matchAndNotifyWorkers;
}
