import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobTemplate } from './job-template.entity';
import {
  CreateJobTemplateDto,
  UpdateJobTemplateDto,
} from './dto/job-template.dto';
import { JobsService } from '../jobs/jobs.service';
import { CreateJobDto } from '../jobs/dto/job.dto';
import { Job } from '../jobs/job.entity';

@Injectable()
export class JobTemplatesService {
  constructor(
    @InjectRepository(JobTemplate)
    private readonly repo: Repository<JobTemplate>,
    private readonly jobsService: JobsService,
  ) {}

  findMy(userId: string): Promise<JobTemplate[]> {
    return this.repo.find({
      where: { userId },
      order: { useCount: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<JobTemplate> {
    const tpl = await this.repo.findOne({ where: { id } });
    if (!tpl) throw new NotFoundException('Şablon bulunamadı');
    if (tpl.userId !== userId) throw new ForbiddenException('Bu şablona erişim yok');
    return tpl;
  }

  async create(dto: CreateJobTemplateDto, userId: string): Promise<JobTemplate> {
    const tpl = this.repo.create({ ...dto, userId });
    return this.repo.save(tpl);
  }

  async update(
    id: string,
    dto: UpdateJobTemplateDto,
    userId: string,
  ): Promise<JobTemplate> {
    const tpl = await this.findOne(id, userId);
    Object.assign(tpl, dto);
    return this.repo.save(tpl);
  }

  async remove(id: string, userId: string): Promise<{ success: boolean }> {
    const tpl = await this.findOne(id, userId);
    await this.repo.remove(tpl);
    return { success: true };
  }

  async instantiate(templateId: string, userId: string): Promise<Job> {
    const tpl = await this.findOne(templateId, userId);
    const createJobDto: CreateJobDto = {
      title: tpl.title,
      description: tpl.description,
      category: tpl.category,
      location: tpl.location,
      budgetMin: tpl.budgetMin ?? undefined,
      budgetMax: tpl.budgetMax ?? undefined,
      photos: tpl.photos ?? undefined,
    };
    const job = await this.jobsService.create(createJobDto, userId);
    tpl.useCount = (tpl.useCount ?? 0) + 1;
    await this.repo.save(tpl);
    return job;
  }
}
