import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { Job, JobStatus } from '../jobs/job.entity';
import { User } from '../users/user.entity';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly client: Anthropic;

  constructor(
    @InjectRepository(Job)
    private jobsRepo: Repository<Job>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private configService: ConfigService,
  ) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  /** GET /ai/recommend/workers/:jobId — top 5 workers for a job */
  async recommendWorkersForJob(jobId: string): Promise<User[]> {
    const job = await this.jobsRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('İlan bulunamadı');

    // Workers in same category, max 20
    const workers = await this.usersRepo
      .createQueryBuilder('u')
      .where(`u.workerCategories LIKE :cat`, { cat: `%${job.category}%` })
      .andWhere('u.asWorkerTotal >= 0')
      .orderBy('u.wilsonScore', 'DESC')
      .limit(20)
      .getMany();

    if (workers.length === 0) return [];

    const workerList = workers.map((w) => ({
      id: w.id,
      name: w.fullName,
      rating: w.averageRating,
      skills: (w.workerCategories ?? []).join(', '),
      completedJobs: w.asWorkerSuccess,
    }));

    const prompt = `Job: ${job.title}, ${job.description ?? ''}
Workers: ${JSON.stringify(workerList)}
Return JSON array of top 5 worker IDs ranked by fit. Only IDs, no explanation. Example: ["id1","id2","id3","id4","id5"]`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: [
          {
            type: 'text',
            text: 'You are a job matching AI. Rank workers by fit for a job. Return only a JSON array of worker IDs.',
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: prompt }],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '[]';
      const rankedIds: string[] = JSON.parse(text.match(/\[.*\]/s)?.[0] ?? '[]');

      const idToWorker = new Map(workers.map((w) => [w.id, w]));
      return rankedIds
        .filter((id) => idToWorker.has(id))
        .map((id) => idToWorker.get(id)!)
        .slice(0, 5);
    } catch (err) {
      this.logger.warn(`Haiku ranking failed: ${String(err)}`);
      return workers.slice(0, 5);
    }
  }

  /** GET /ai/recommend/jobs/:workerId — top 5 open jobs for a worker */
  async recommendJobsForWorker(workerId: string): Promise<Job[]> {
    const worker = await this.usersRepo.findOne({ where: { id: workerId } });
    if (!worker) throw new NotFoundException('Kullanıcı bulunamadı');

    const categories = worker.workerCategories ?? [];

    let query = this.jobsRepo
      .createQueryBuilder('j')
      .where('j.status = :status', { status: JobStatus.OPEN })
      .orderBy('j.createdAt', 'DESC')
      .limit(20);

    if (categories.length > 0) {
      query = query.andWhere(
        `(${categories.map((_, i) => `j.category LIKE :cat${i}`).join(' OR ')})`,
        Object.fromEntries(categories.map((c, i) => [`cat${i}`, `%${c}%`])),
      );
    }

    const jobs = await query.getMany();
    if (jobs.length === 0) return [];

    const jobList = jobs.map((j) => ({
      id: j.id,
      title: j.title,
      category: j.category,
      location: j.location,
    }));

    const prompt = `Worker skills: ${categories.join(', ')}
Open jobs: ${JSON.stringify(jobList)}
Return JSON array of top 5 job IDs ranked by fit. Only IDs, no explanation. Example: ["id1","id2","id3","id4","id5"]`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: [
          {
            type: 'text',
            text: 'You are a job matching AI. Rank jobs by fit for a worker. Return only a JSON array of job IDs.',
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: prompt }],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '[]';
      const rankedIds: string[] = JSON.parse(text.match(/\[.*\]/s)?.[0] ?? '[]');

      const idToJob = new Map(jobs.map((j) => [j.id, j]));
      return rankedIds
        .filter((id) => idToJob.has(id))
        .map((id) => idToJob.get(id)!)
        .slice(0, 5);
    } catch (err) {
      this.logger.warn(`Haiku ranking failed: ${String(err)}`);
      return jobs.slice(0, 5);
    }
  }
}
