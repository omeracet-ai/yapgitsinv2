import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserBlock } from './user-block.entity';
import {
  UserReport,
  UserReportReason,
  UserReportStatus,
} from './user-report.entity';
import { User } from '../users/user.entity';

@Injectable()
export class UserBlocksService {
  constructor(
    @InjectRepository(UserBlock)
    private blocksRepo: Repository<UserBlock>,
    @InjectRepository(UserReport)
    private reportsRepo: Repository<UserReport>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  async block(blockerId: string, blockedUserId: string): Promise<UserBlock> {
    if (blockerId === blockedUserId) {
      throw new BadRequestException('Kendinizi bloklayamazsınız');
    }
    const existing = await this.blocksRepo.findOne({
      where: { blockerUserId: blockerId, blockedUserId },
    });
    if (existing) return existing;
    const row = this.blocksRepo.create({
      blockerUserId: blockerId,
      blockedUserId,
    });
    return this.blocksRepo.save(row);
  }

  async unblock(
    blockerId: string,
    blockedUserId: string,
  ): Promise<{ ok: true }> {
    const existing = await this.blocksRepo.findOne({
      where: { blockerUserId: blockerId, blockedUserId },
    });
    if (!existing) throw new NotFoundException('Block kaydı bulunamadı');
    await this.blocksRepo.remove(existing);
    return { ok: true };
  }

  async unblockIdempotent(
    blockerId: string,
    blockedUserId: string,
  ): Promise<{ blocked: false; blockedId: string }> {
    const existing = await this.blocksRepo.findOne({
      where: { blockerUserId: blockerId, blockedUserId },
    });
    if (existing) await this.blocksRepo.remove(existing);
    return { blocked: false, blockedId: blockedUserId };
  }

  async listBlockedPaged(blockerId: string) {
    const rows = await this.blocksRepo.find({
      where: { blockerUserId: blockerId },
      order: { createdAt: 'DESC' },
    });
    if (rows.length === 0) return { data: [], total: 0 };
    const ids = rows.map((r) => r.blockedUserId);
    const users = await this.usersRepo.find({ where: { id: In(ids) } });
    const map = new Map(users.map((u) => [u.id, u]));
    const data = rows.map((r) => {
      const u = map.get(r.blockedUserId);
      return {
        id: r.id,
        blockedId: r.blockedUserId,
        blockedUser: u
          ? {
              id: u.id,
              fullName: u.fullName,
              profileImageUrl: u.profileImageUrl ?? null,
            }
          : null,
        createdAt: r.createdAt,
      };
    });
    return { data, total: data.length };
  }

  async isBlocked(blockerId: string, blockedUserId: string): Promise<boolean> {
    const c = await this.blocksRepo.count({
      where: { blockerUserId: blockerId, blockedUserId },
    });
    return c > 0;
  }

  /**
   * Tek yönlü blok kontrolü yetersiz: A→B veya B→A herhangi biri varsa
   * iki yönde de etkileşim engellenir (chat için).
   */
  async isEitherBlocked(userA: string, userB: string): Promise<boolean> {
    const c = await this.blocksRepo.count({
      where: [
        { blockerUserId: userA, blockedUserId: userB },
        { blockerUserId: userB, blockedUserId: userA },
      ],
    });
    return c > 0;
  }

  async listBlocked(blockerId: string) {
    const rows = await this.blocksRepo.find({
      where: { blockerUserId: blockerId },
      order: { createdAt: 'DESC' },
    });
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.blockedUserId);
    const users = await this.usersRepo.find({ where: { id: In(ids) } });
    const map = new Map(users.map((u) => [u.id, u]));
    return rows.map((r) => {
      const u = map.get(r.blockedUserId);
      return {
        id: r.id,
        blockedUserId: r.blockedUserId,
        createdAt: r.createdAt,
        fullName: u?.fullName ?? null,
        profileImageUrl: u?.profileImageUrl ?? null,
      };
    });
  }

  async listBlockedIds(blockerId: string): Promise<string[]> {
    const rows = await this.blocksRepo.find({
      where: { blockerUserId: blockerId },
      select: ['blockedUserId'],
    });
    return rows.map((r) => r.blockedUserId);
  }

  async report(
    reporterId: string,
    reportedUserId: string,
    reason: UserReportReason,
    description?: string,
  ): Promise<UserReport> {
    if (reporterId === reportedUserId) {
      throw new BadRequestException('Kendinizi bildiremezsiniz');
    }
    const dup = await this.reportsRepo.findOne({
      where: {
        reporterUserId: reporterId,
        reportedUserId,
        status: 'pending',
      },
    });
    if (dup) {
      throw new ConflictException('Bu kullanıcı için bekleyen şikayetiniz var');
    }
    const row = this.reportsRepo.create({
      reporterUserId: reporterId,
      reportedUserId,
      reason,
      description: description ?? null,
      status: 'pending',
    });
    return this.reportsRepo.save(row);
  }

  async findReports(status?: UserReportStatus): Promise<UserReport[]> {
    return this.reportsRepo.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async findReportsPaged(
    status?: UserReportStatus,
    page = 1,
    limit = 20,
  ): Promise<{
    data: UserReport[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const [data, total] = await this.reportsRepo.findAndCount({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit) || 1,
    };
  }

  async updateReportStatus(
    reportId: string,
    status: UserReportStatus,
    adminNote?: string,
  ): Promise<UserReport> {
    const r = await this.reportsRepo.findOne({ where: { id: reportId } });
    if (!r) throw new NotFoundException('Rapor bulunamadı');
    r.status = status;
    if (adminNote !== undefined) r.adminNote = adminNote;
    return this.reportsRepo.save(r);
  }
}
