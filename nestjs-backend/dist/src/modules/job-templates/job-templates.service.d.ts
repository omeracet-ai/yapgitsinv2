import { Repository } from 'typeorm';
import { JobTemplate } from './job-template.entity';
import { CreateJobTemplateDto, UpdateJobTemplateDto } from './dto/job-template.dto';
import { JobsService } from '../jobs/jobs.service';
import { Job } from '../jobs/job.entity';
export declare class JobTemplatesService {
    private readonly repo;
    private readonly jobsService;
    constructor(repo: Repository<JobTemplate>, jobsService: JobsService);
    findMy(userId: string): Promise<JobTemplate[]>;
    findOne(id: string, userId: string): Promise<JobTemplate>;
    create(dto: CreateJobTemplateDto, userId: string): Promise<JobTemplate>;
    update(id: string, dto: UpdateJobTemplateDto, userId: string): Promise<JobTemplate>;
    remove(id: string, userId: string): Promise<{
        success: boolean;
    }>;
    instantiate(templateId: string, userId: string): Promise<Job>;
}
