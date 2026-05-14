import { JobTemplatesService } from './job-templates.service';
import { CreateJobTemplateDto, UpdateJobTemplateDto } from './dto/job-template.dto';
export declare class JobTemplatesController {
    private readonly service;
    constructor(service: JobTemplatesService);
    findMy(req: any): Promise<import("./job-template.entity").JobTemplate[]>;
    findOne(id: string, req: any): Promise<import("./job-template.entity").JobTemplate>;
    create(dto: CreateJobTemplateDto, req: any): Promise<import("./job-template.entity").JobTemplate>;
    update(id: string, dto: UpdateJobTemplateDto, req: any): Promise<import("./job-template.entity").JobTemplate>;
    remove(id: string, req: any): Promise<{
        success: boolean;
    }>;
    instantiate(id: string, req: any): Promise<import("../jobs/job.entity").Job>;
}
