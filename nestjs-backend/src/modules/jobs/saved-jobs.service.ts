import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedJob } from './saved-job.entity';
import { Job, JobStatus } from './job.entity';

export interface SavedJobPublic {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  budgetMin: number | null;
  budgetMax: number | null;
  status: JobStatus;
  photos: string[] | null;
  customerId: string;
  createdAt: Date;
  dueDate: string | null;
  savedAt: Date;
}

const DESC_LIMIT = 200;

@Injectable()
export class SavedJobsService {
  constructor(
    @InjectRepository(SavedJob)
    private readonly savedRepo: Repository<SavedJob>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
  ) {}

  async saveJob(
    userId: string,
    jobId: string,
  ): Promise<{ saved: true; jobId: string }> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      select: ['id'],
    });
    if (!job) throw new NotFoundException('Job not found');

    // Idempotent insert: ignore duplicate via unique index
    try {
      await this.savedRepo.insert({ userId, jobId });
    } catch {
      // unique violation — already saved, treat as success
    }
    return { saved: true, jobId };
  }

  async unsaveJob(
    userId: string,
    jobId: string,
  ): Promise<{ saved: false; jobId: string }> {
    await this.savedRepo.delete({ userId, jobId });
    return { saved: false, jobId };
  }

  async listSaved(
    userId: string,
  ): Promise<{ data: SavedJobPublic[]; total: number }> {
    const rows = await this.savedRepo
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.job', 'j')
      .where('s.userId = :userId', { userId })
      .orderBy('s.createdAt', 'DESC')
      .getMany();

    const data: SavedJobPublic[] = rows.map((s) => {
      const j = s.job;
      const desc = j.description ?? '';
      return {
        id: j.id,
        title: j.title,
        description:
          desc.length > DESC_LIMIT ? desc.slice(0, DESC_LIMIT) + '…' : desc,
        category: j.category,
        location: j.location,
        budgetMin: j.budgetMin ?? null,
        budgetMax: j.budgetMax ?? null,
        status: j.status,
        photos: j.photos ?? null,
        customerId: j.customerId,
        createdAt: j.createdAt,
        dueDate: j.dueDate ?? null,
        savedAt: s.createdAt,
      };
    });
    return { data, total: data.length };
  }
}
