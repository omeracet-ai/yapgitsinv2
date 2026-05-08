import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { LeadRequest, LeadSource, LeadStatus } from './lead-request.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    @InjectRepository(LeadRequest)
    private readonly repo: Repository<LeadRequest>,
  ) {}

  async create(
    dto: CreateLeadDto,
    meta: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<{ id: string; status: LeadStatus }> {
    // Honeypot check — silent success for bots
    if (dto.website && dto.website.trim().length > 0) {
      this.logger.warn(`[leads] honeypot triggered (ip=${meta.ipAddress ?? 'n/a'})`);
      return { id: 'honeypot', status: 'spam' };
    }
    const entity = this.repo.create({
      name: dto.name.trim(),
      phoneNumber: dto.phoneNumber.trim(),
      email: dto.email?.trim() || null,
      message: dto.message.trim(),
      category: dto.category?.trim() || null,
      targetWorkerId: dto.targetWorkerId || null,
      source: (dto.source || 'landing') as LeadSource,
      status: 'new',
      ipAddress: meta.ipAddress || null,
      userAgent: meta.userAgent || null,
    });
    const saved = await this.repo.save(entity);
    return { id: saved.id, status: saved.status };
  }

  async findFiltered(opts: {
    status?: LeadStatus;
    source?: LeadSource;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: LeadRequest[]; total: number; page: number; limit: number; pages: number }> {
    const page = Math.max(1, Math.floor(opts.page ?? 1));
    const limit = Math.max(1, Math.min(200, Math.floor(opts.limit ?? 50)));
    const qb = this.repo
      .createQueryBuilder('lead')
      .orderBy('lead.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    if (opts.status) qb.andWhere('lead.status = :status', { status: opts.status });
    if (opts.source) qb.andWhere('lead.source = :source', { source: opts.source });
    if (opts.from) {
      const d = new Date(opts.from);
      if (!isNaN(d.getTime())) qb.andWhere('lead.createdAt >= :from', { from: d });
    }
    if (opts.to) {
      const d = new Date(opts.to);
      if (!isNaN(d.getTime())) qb.andWhere('lead.createdAt <= :to', { to: d });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  }

  async update(id: string, dto: UpdateLeadDto): Promise<LeadRequest> {
    const lead = await this.repo.findOne({ where: { id } });
    if (!lead) throw new NotFoundException('Lead bulunamadı');
    if (dto.status) {
      lead.status = dto.status;
      if (dto.status === 'contacted' && !lead.contactedAt) {
        lead.contactedAt = new Date();
      }
    }
    if (dto.notes !== undefined) lead.notes = dto.notes || null;
    return this.repo.save(lead);
  }

  // unused helper kept for future date-range util
  _between = Between;
  _bad = BadRequestException;
}
