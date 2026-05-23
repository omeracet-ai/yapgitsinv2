import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { LeadRequest, LeadSource, LeadStatus } from './lead-request.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    @InjectRepository(LeadRequest)
    private readonly repo: Repository<LeadRequest>,
    private readonly emailService: EmailService,
  ) {}

  /** Yeni talep bildirimi gönderilecek adres (env ile override edilebilir). */
  private leadNotifyEmail(): string {
    return process.env.LEAD_NOTIFY_EMAIL || 'bysabri0@gmail.com';
  }

  /** Yeni talep geldiğinde yöneticiye e-posta bildirimi (fire-and-forget). */
  private notifyNewLead(lead: LeadRequest): void {
    const to = this.leadNotifyEmail();
    const esc = (s: string | null | undefined) =>
      (s ?? '—').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `
      <h2>Yeni Talep — Yapgitsin</h2>
      <p><b>Ad:</b> ${esc(lead.name)}</p>
      <p><b>Telefon:</b> ${esc(lead.phoneNumber)}</p>
      <p><b>E-posta:</b> ${esc(lead.email)}</p>
      <p><b>Kategori:</b> ${esc(lead.category)}</p>
      <p><b>Kaynak:</b> ${esc(lead.source)}</p>
      <p><b>Mesaj:</b><br/>${esc(lead.message)}</p>
      <hr/>
      <p style="color:#6b7280;font-size:12px">Talep ID: ${lead.id} · ${new Date(lead.createdAt).toLocaleString('tr-TR')}</p>`;
    const text =
      `Yeni Talep — Yapgitsin\n` +
      `Ad: ${lead.name}\nTelefon: ${lead.phoneNumber}\n` +
      `E-posta: ${lead.email ?? '—'}\nKategori: ${lead.category ?? '—'}\n` +
      `Kaynak: ${lead.source}\nMesaj: ${lead.message}\nID: ${lead.id}`;
    void this.emailService
      .send(to, 'Yeni Talep — Yapgitsin', html, text)
      .catch((e) =>
        this.logger.error(
          `[leads] bildirim e-postası başarısız (${to}): ${(e as Error).message}`,
        ),
      );
  }

  async create(
    dto: CreateLeadDto,
    meta: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<{ id: string; status: LeadStatus }> {
    // Honeypot check — silent success for bots
    if (dto.website && dto.website.trim().length > 0) {
      this.logger.warn(
        `[leads] honeypot triggered (ip=${meta.ipAddress ?? 'n/a'})`,
      );
      return { id: 'honeypot', status: 'spam' };
    }
    const entity = this.repo.create({
      name: dto.name.trim(),
      phoneNumber: dto.phoneNumber.trim(),
      email: dto.email?.trim() || null,
      message: dto.message.trim(),
      category: dto.category?.trim() || null,
      targetWorkerId: dto.targetWorkerId || null,
      source: dto.source || 'landing',
      status: 'new',
      ipAddress: meta.ipAddress || null,
      userAgent: meta.userAgent || null,
    });
    const saved = await this.repo.save(entity);
    // Yeni talep → yöneticiye e-posta bildirimi (engellemez).
    this.notifyNewLead(saved);
    return { id: saved.id, status: saved.status };
  }

  async findFiltered(opts: {
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
  }> {
    const page = Math.max(1, Math.floor(opts.page ?? 1));
    const limit = Math.max(1, Math.min(200, Math.floor(opts.limit ?? 50)));
    const qb = this.repo
      .createQueryBuilder('lead')
      .orderBy('lead.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    if (opts.status)
      qb.andWhere('lead.status = :status', { status: opts.status });
    if (opts.source)
      qb.andWhere('lead.source = :source', { source: opts.source });
    if (opts.from) {
      const d = new Date(opts.from);
      if (!isNaN(d.getTime()))
        qb.andWhere('lead.createdAt >= :from', { from: d });
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
