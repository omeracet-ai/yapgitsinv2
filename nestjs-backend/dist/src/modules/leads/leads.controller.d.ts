import type { Request } from 'express';
import { LeadsService } from './leads.service';
import { JobLeadsService } from './job-leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateJobLeadDto } from './dto/create-job-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import type { AuthUser } from '../../common/types/auth.types';
import type { LeadSource, LeadStatus } from './lead-request.entity';
import type { JobLeadStatus } from './job-lead.entity';
export declare class LeadsController {
    private readonly svc;
    private readonly jobSvc;
    private readonly audit;
    constructor(svc: LeadsService, jobSvc: JobLeadsService, audit: AdminAuditService);
    create(dto: CreateLeadDto, req: Request): Promise<{
        id: string;
        status: LeadStatus;
    }>;
    list(status?: LeadStatus, source?: LeadSource, from?: string, to?: string, page?: string, limit?: string): Promise<{
        data: import("./lead-request.entity").LeadRequest[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    update(id: string, dto: UpdateLeadDto, req: Request & {
        user: AuthUser;
    }): Promise<import("./lead-request.entity").LeadRequest>;
    createJobLead(dto: CreateJobLeadDto, req: Request & {
        user?: AuthUser;
    }): Promise<{
        id: string;
        status: JobLeadStatus;
    }>;
    getJobLead(id: string): Promise<import("./job-lead.entity").JobLead>;
    getUserJobLeads(req: Request & {
        user: AuthUser;
    }, page?: string, limit?: string): Promise<{
        data: import("./job-lead.entity").JobLead[];
        total: number;
        pages: number;
    }>;
    updateJobLeadStatus(id: string, body: {
        status: JobLeadStatus;
    }, req: Request & {
        user: AuthUser;
    }): Promise<import("./job-lead.entity").JobLead>;
    getJobLeadResponses(id: string): Promise<import("./job-lead-response.entity").JobLeadResponse[]>;
}
