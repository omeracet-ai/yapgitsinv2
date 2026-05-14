import { BadRequestException } from '@nestjs/common';
import { Between, Repository } from 'typeorm';
import { LeadRequest, LeadSource, LeadStatus } from './lead-request.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
export declare class LeadsService {
    private readonly repo;
    private readonly logger;
    constructor(repo: Repository<LeadRequest>);
    create(dto: CreateLeadDto, meta: {
        ipAddress?: string | null;
        userAgent?: string | null;
    }): Promise<{
        id: string;
        status: LeadStatus;
    }>;
    findFiltered(opts: {
        status?: LeadStatus;
        source?: LeadSource;
        from?: string;
        to?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: LeadRequest[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    update(id: string, dto: UpdateLeadDto): Promise<LeadRequest>;
    _between: typeof Between;
    _bad: typeof BadRequestException;
}
