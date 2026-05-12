import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobLead, JobLeadStatus } from './job-lead.entity';
import { JobLeadResponse, JobLeadResponseStatus } from './job-lead-response.entity';
import { CreateJobLeadDto } from './dto/create-job-lead.dto';
import { User } from '../users/user.entity';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';

@Injectable()
export class JobLeadsService {
  private readonly logger = new Logger(JobLeadsService.name);

  constructor(
    @InjectRepository(JobLead)
    private readonly leadRepo: Repository<JobLead>,
    @InjectRepository(JobLeadResponse)
    private readonly responseRepo: Repository<JobLeadResponse>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    dto: CreateJobLeadDto,
    customerId?: string,
  ): Promise<{ id: string; status: JobLeadStatus }> {
    // Validate budget range
    if (dto.budgetMin && dto.budgetMax && dto.budgetMin > dto.budgetMax) {
      throw new BadRequestException('Minimum bütçe maksimumdan büyük olamaz');
    }

    const lead = this.leadRepo.create({
      category: dto.category.trim(),
      city: dto.city.trim(),
      description: dto.description?.trim() || null,
      budgetMin: dto.budgetMin || null,
      budgetMax: dto.budgetMax || null,
      budgetVisible: dto.budgetVisible || false,
      requesterName: dto.requesterName.trim(),
      requesterPhone: dto.requesterPhone.trim(),
      requesterEmail: dto.requesterEmail.trim(),
      preferredContactTime: dto.preferredContactTime || 'flexible',
      status: 'open',
      customerId: customerId || null,
      attachments: dto.attachments ? JSON.stringify(dto.attachments) : null,
    });

    const saved = await this.leadRepo.save(lead);
    this.logger.log(`[leads] created lead ${saved.id} for ${saved.category} in ${saved.city}`);

    // Trigger async worker matching and email notifications (non-blocking)
    this.matchAndNotifyWorkers(saved).catch((err) => {
      this.logger.error(`[leads] async matching failed for lead ${saved.id}: ${err.message}`);
    });

    return { id: saved.id, status: saved.status };
  }

  async findById(id: string, includeResponses = true): Promise<JobLead> {
    const lead = await this.leadRepo.findOne({
      where: { id },
      relations: includeResponses ? ['responses', 'responses.worker'] : [],
    });

    if (!lead) throw new NotFoundException('İş isteği bulunamadı');
    return lead;
  }

  async findByCustomerId(
    customerId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: JobLead[]; total: number; pages: number }> {
    const [data, total] = await this.leadRepo.findAndCount({
      where: { customerId },
      relations: ['responses'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      data,
      total,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  async updateStatus(id: string, status: JobLeadStatus): Promise<JobLead> {
    const lead = await this.findById(id, false);
    lead.status = status;
    return this.leadRepo.save(lead);
  }

  // ---- Worker Matching ----
  async matchWorkers(leadId: string): Promise<User[]> {
    const lead = await this.findById(leadId, false);
    if (!lead) throw new NotFoundException('Lead not found');

    // Query workers matching:
    // 1. Categories include lead category
    // 2. City matches (or all Turkey if worker has no city restriction)
    // 3. Identity verified
    // 4. Available

    const workers = await this.userRepo
      .createQueryBuilder('u')
      .where('u.workerCategories LIKE :category', { category: `%${lead.category}%` })
      .andWhere('(u.city = :city OR u.city IS NULL OR u.city = "")', { city: lead.city })
      .andWhere('u.identityVerified = true')
      .andWhere('u.isAvailable = true')
      .orderBy('u.averageRating', 'DESC')
      .addOrderBy('u.reputationScore', 'DESC')
      .limit(10)
      .getMany();

    this.logger.log(`[leads] matched ${workers.length} workers for lead ${leadId}`);
    return workers;
  }

  async recordResponse(
    leadId: string,
    workerId: string,
    status: JobLeadResponseStatus,
    message?: string,
  ): Promise<JobLeadResponse> {
    const lead = await this.leadRepo.findOne({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const worker = await this.userRepo.findOne({ where: { id: workerId } });
    if (!worker) throw new NotFoundException('Worker not found');

    let response = await this.responseRepo.findOne({
      where: { leadId, workerId },
    });

    if (!response) {
      response = this.responseRepo.create({
        leadId,
        workerId,
        status,
        workerMessage: message || null,
      });
    } else {
      response.status = status;
      if (message) response.workerMessage = message;
    }

    if (status === 'contacted' || status === 'accepted') {
      response.respondedAt = new Date();
    }

    return this.responseRepo.save(response);
  }

  async getLeadResponses(leadId: string): Promise<JobLeadResponse[]> {
    return this.responseRepo.find({
      where: { leadId },
      relations: ['worker'],
      order: { createdAt: 'DESC' },
    });
  }

  private async matchAndNotifyWorkers(lead: JobLead): Promise<void> {
    try {
      // Find matching workers
      const workers = await this.matchWorkers(lead.id);
      this.logger.log(`[leads] notifying ${workers.length} workers for lead ${lead.id}`);

      // Send emails and push notifications to matched workers
      for (const worker of workers) {
        await this.emailService.sendJobLeadNotification(
          { id: worker.id, email: worker.email, fullName: worker.fullName },
          {
            id: lead.id,
            category: lead.category,
            city: lead.city,
            description: lead.description || undefined,
            budgetMin: lead.budgetMin || undefined,
            budgetMax: lead.budgetMax || undefined,
            requesterName: lead.requesterName,
          },
        );

        // Phase 164 — send push notification for lead match
        void this.notificationsService.send({
          userId: worker.id,
          type: NotificationType.SAVED_SEARCH_MATCH,
          title: `Yeni ${lead.category} isteği: ${lead.city}`,
          body: lead.description
            ? lead.description.substring(0, 100)
            : `Bütçe: ${lead.budgetMin || 'yazılacak'} - ${lead.budgetMax || 'yazılacak'} TL`,
          refId: lead.id,
          relatedType: 'job',
          relatedId: lead.id,
        });

        // Record the email send as a response entry
        await this.responseRepo.save(
          this.responseRepo.create({
            leadId: lead.id,
            workerId: worker.id,
            status: 'sent_email',
          }),
        );
      }

      // Send confirmation email to customer if email provided
      if (lead.requesterEmail) {
        await this.emailService.sendLeadConfirmation(
          {
            id: lead.customerId || undefined,
            email: lead.requesterEmail,
            fullName: lead.requesterName,
          },
          {
            category: lead.category,
            city: lead.city,
          },
        );
      }

      this.logger.log(`[leads] matching and notifications complete for lead ${lead.id}`);
    } catch (err) {
      this.logger.error(`[leads] error in matchAndNotifyWorkers: ${(err as Error).message}`);
    }
  }
}
