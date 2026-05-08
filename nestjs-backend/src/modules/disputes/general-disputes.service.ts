import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Dispute,
  GeneralDisputeStatus,
  GeneralDisputeType,
} from './dispute.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { User, UserRole } from '../users/user.entity';

export interface CreateDisputeDto {
  jobId?: string | null;
  bookingId?: string | null;
  againstUserId: string;
  type: GeneralDisputeType;
  description: string;
}

export interface ResolveDisputeDto {
  status: GeneralDisputeStatus.RESOLVED | GeneralDisputeStatus.DISMISSED;
  resolution: string;
}

@Injectable()
export class GeneralDisputesService {
  constructor(
    @InjectRepository(Dispute)
    private readonly repo: Repository<Dispute>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notifications: NotificationsService,
  ) {}

  async create(raisedBy: string, dto: CreateDisputeDto): Promise<Dispute> {
    if (!dto.againstUserId || !dto.type || !dto.description?.trim()) {
      throw new BadRequestException('againstUserId, type, description gerekli');
    }
    if (dto.againstUserId === raisedBy) {
      throw new BadRequestException('Kendinize karşı şikayet açamazsınız');
    }
    const entity = this.repo.create({
      jobId: dto.jobId ?? null,
      bookingId: dto.bookingId ?? null,
      raisedBy,
      againstUserId: dto.againstUserId,
      type: dto.type,
      description: dto.description.trim(),
      status: GeneralDisputeStatus.OPEN,
    });
    const saved = await this.repo.save(entity);

    // Notify all admins
    const admins = await this.userRepo.find({ where: { role: UserRole.ADMIN } });
    for (const a of admins) {
      await this.notifications.send({
        userId: a.id,
        type: NotificationType.DISPUTE_OPENED,
        title: 'Yeni şikayet açıldı',
        body: `Yeni bir ${dto.type} tipinde anlaşmazlık açıldı.`,
        refId: saved.id,
      });
    }
    return saved;
  }

  findMine(userId: string): Promise<Dispute[]> {
    return this.repo.find({
      where: [{ raisedBy: userId }, { againstUserId: userId }],
      order: { createdAt: 'DESC' },
    });
  }

  async findForAdmin(
    status?: GeneralDisputeStatus,
    page = 1,
    limit = 20,
  ): Promise<{ data: Dispute[]; total: number; page: number; limit: number; pages: number }> {
    const qb = this.repo.createQueryBuilder('d').orderBy('d.createdAt', 'DESC');
    if (status) qb.andWhere('d.status = :status', { status });
    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  }

  async resolve(
    id: string,
    adminId: string,
    dto: ResolveDisputeDto,
  ): Promise<Dispute> {
    const d = await this.repo.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Şikayet bulunamadı');
    if (
      d.status === GeneralDisputeStatus.RESOLVED ||
      d.status === GeneralDisputeStatus.DISMISSED
    ) {
      throw new ForbiddenException('Şikayet zaten kapatılmış');
    }
    if (
      dto.status !== GeneralDisputeStatus.RESOLVED &&
      dto.status !== GeneralDisputeStatus.DISMISSED
    ) {
      throw new BadRequestException('status sadece resolved veya dismissed olabilir');
    }
    d.status = dto.status;
    d.resolution = dto.resolution;
    d.resolvedAt = new Date();
    d.resolvedBy = adminId;
    const saved = await this.repo.save(d);

    // Notify both parties
    const title =
      dto.status === GeneralDisputeStatus.RESOLVED
        ? 'Şikayetiniz çözüldü'
        : 'Şikayetiniz reddedildi';
    for (const uid of [d.raisedBy, d.againstUserId]) {
      await this.notifications.send({
        userId: uid,
        type: NotificationType.DISPUTE_RESOLVED,
        title,
        body: dto.resolution,
        refId: saved.id,
      });
    }
    return saved;
  }
}
