import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStatus } from './job.entity';
import { Offer, OfferStatus } from './offer.entity';
import { UsersService } from '../users/users.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';

// Geçerli UUID — SQLite ve PostgreSQL uyumlu sabit seed kimliği
const SEED_USER_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private jobsRepository: Repository<Job>,
    @InjectRepository(Offer)
    private offersRepository: Repository<Offer>,
    private usersService: UsersService,
  ) {}

  async onModuleInit() {
    const seedUser = await this.usersService.findByEmail('seed@hizmet.app');
    if (!seedUser) {
      await this.usersService.create({
        id: SEED_USER_ID,
        fullName: 'Seed User',
        phoneNumber: '05555555555',
        email: 'seed@hizmet.app',
        passwordHash: 'hashed_password',
      });
    }

    const count = await this.jobsRepository.count();
    if (count === 0) {
      const userId = seedUser?.id ?? SEED_USER_ID;
      await this.jobsRepository.save([
        {
          title: 'Salon Badana',
          description: '3+1 daire, düz boya yeterli. Malzeme bizden.',
          category: 'Boya & Badana',
          location: 'Kadıköy, İstanbul',
          budgetMin: 500,
          budgetMax: 1500,
          status: JobStatus.OPEN,
          customerId: userId,
        },
        {
          title: 'Mutfak Musluk Tamiri',
          description:
            'Musluk su kaçırıyor, conta değişimi veya yenileme gerek.',
          category: 'Tesisat',
          location: 'Beşiktaş, İstanbul',
          budgetMin: 100,
          budgetMax: 300,
          status: JobStatus.OPEN,
          customerId: userId,
        },
        {
          title: 'Haftalık Ev Temizliği',
          description: 'Her Cuma günü rutin ev temizliği yapılacak.',
          category: 'Temizlik',
          location: 'Üsküdar, İstanbul',
          budgetMin: 800,
          budgetMax: 1200,
          status: JobStatus.OPEN,
          customerId: userId,
        },
      ]);
    }
  }

  async findAll(filters?: {
    category?: string;
    status?: JobStatus;
    limit?: number;
    customerId?: string;
  }): Promise<Job[]> {
    const query = this.jobsRepository.createQueryBuilder('job');

    if (filters?.category) {
      query.andWhere('job.category = :category', {
        category: filters.category,
      });
    }
    if (filters?.status) {
      query.andWhere('job.status = :status', { status: filters.status });
    }
    if (filters?.customerId) {
      query.andWhere('job.customerId = :customerId', {
        customerId: filters.customerId,
      });
    }

    // Öne çıkan ilanlar (featuredOrder 1-3) en üstte, sonra tarihe göre
    query
      .orderBy(
        'CASE WHEN job.featuredOrder IS NOT NULL THEN 0 ELSE 1 END',
        'ASC',
      )
      .addOrderBy('job.featuredOrder', 'ASC')
      .addOrderBy('job.createdAt', 'DESC');

    if (filters?.limit) {
      query.take(filters.limit);
    }

    return query.getMany();
  }

  async setFeaturedOrder(
    id: string,
    featuredOrder: number | null,
  ): Promise<Job> {
    const job = await this.jobsRepository.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`İlan bulunamadı: #${id}`);
    job.featuredOrder = featuredOrder;
    return this.jobsRepository.save(job);
  }

  async findOne(id: string): Promise<Job & { customer?: object }> {
    const job = await this.jobsRepository.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`İlan bulunamadı: #${id}`);

    const customer = await this.usersService.findById(job.customerId);
    if (customer) {
      const { passwordHash: _ph, ...safe } = customer as {
        passwordHash?: string;
      } & typeof customer;
      return {
        ...job,
        customer: {
          id: safe.id,
          fullName: safe.fullName,
          profileImageUrl: safe.profileImageUrl,
          averageRating: safe.averageRating ?? 0,
          totalReviews: safe.totalReviews ?? 0,
          reputationScore: safe.reputationScore ?? 0,
          city: safe.city ?? '',
          createdAt: safe.createdAt,
        },
      };
    }
    return job;
  }

  async create(createJobDto: CreateJobDto, customerId: string): Promise<Job> {
    const job = this.jobsRepository.create({
      ...createJobDto,
      customerId,
      status: JobStatus.OPEN,
    });
    return this.jobsRepository.save(job);
  }

  async update(
    id: string,
    updateJobDto: UpdateJobDto,
    requesterId?: string,
  ): Promise<Job> {
    const job = await this.jobsRepository.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`İlan bulunamadı: #${id}`);
    if (requesterId && job.customerId !== requesterId) {
      throw new ForbiddenException('Bu ilanı düzenleme yetkiniz yok.');
    }
    const prevStatus = job.status;
    Object.assign(job, updateJobDto);
    const saved = await this.jobsRepository.save(job);

    if (updateJobDto.status && updateJobDto.status !== prevStatus) {
      await this._trackStatusChange(
        saved.id,
        saved.customerId,
        prevStatus,
        saved.status,
      );
    }

    return saved;
  }

  private async _trackStatusChange(
    jobId: string,
    customerId: string,
    prev: JobStatus,
    next: JobStatus,
  ) {
    if (next === JobStatus.COMPLETED) {
      if (prev !== JobStatus.COMPLETED)
        await this.usersService.bumpStat(customerId, 'asCustomerTotal');
      await this.usersService.bumpStat(customerId, 'asCustomerSuccess');
      await this.usersService.recalcReputation(customerId);

      // Find accepted offer and bump worker stats
      const acceptedOffer = await this.offersRepository.findOne({
        where: { jobId, status: OfferStatus.ACCEPTED },
      });
      if (acceptedOffer) {
        await this.usersService.bumpStat(
          acceptedOffer.userId,
          'asWorkerSuccess',
        );
        await this.usersService.recalcReputation(acceptedOffer.userId);
      }
    } else if (next === JobStatus.CANCELLED) {
      if (prev !== JobStatus.CANCELLED)
        await this.usersService.bumpStat(customerId, 'asCustomerTotal');
      await this.usersService.bumpStat(customerId, 'asCustomerFail');
      await this.usersService.recalcReputation(customerId);

      // Find accepted offer and bump worker fail stats
      const acceptedOffer = await this.offersRepository.findOne({
        where: { jobId, status: OfferStatus.ACCEPTED },
      });
      if (acceptedOffer) {
        await this.usersService.bumpStat(acceptedOffer.userId, 'asWorkerFail');
        await this.usersService.recalcReputation(acceptedOffer.userId);
      }
    }
  }

  async remove(id: string, requesterId?: string): Promise<void> {
    const job = await this.jobsRepository.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`İlan bulunamadı: #${id}`);
    if (requesterId && job.customerId !== requesterId) {
      throw new ForbiddenException('Bu ilanı silme yetkiniz yok.');
    }
    await this.jobsRepository.remove(job);
  }
}
