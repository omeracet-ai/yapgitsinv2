import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLog } from './admin-audit-log.entity';
import { User } from '../users/user.entity';

export interface AuditLogStats {
  totalEntries: number;
  entriesPerDay: { date: string; count: number }[];
  topActions: { action: string; count: number }[];
  topAdmins: { adminUserId: string; adminName: string; count: number }[];
  topTargetTypes: { targetType: string; count: number }[];
}

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly repo: Repository<AdminAuditLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async logAction(
    adminUserId: string,
    action: string,
    targetType?: string,
    targetId?: string,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const entity = this.repo.create({
        adminUserId,
        action,
        targetType: targetType ?? null,
        targetId: targetId ?? null,
        payload: payload ?? null,
      });
      await this.repo.save(entity);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`[audit] failed: ${msg}`);
    }
  }

  async findFiltered(opts: {
    limit?: number;
    offset?: number;
    action?: string;
    targetType?: string;
    adminUserId?: string;
  }): Promise<{ data: AdminAuditLog[]; total: number }> {
    const limit = opts.limit ?? 100;
    const offset = opts.offset ?? 0;
    const qb = this.repo
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (opts.action) {
      qb.andWhere('log.action = :action', { action: opts.action });
    }
    if (opts.targetType) {
      qb.andWhere('log.targetType = :targetType', {
        targetType: opts.targetType,
      });
    }
    if (opts.adminUserId) {
      qb.andWhere('log.adminUserId = :adminUserId', {
        adminUserId: opts.adminUserId,
      });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findRecent(limit = 100, offset = 0): Promise<AdminAuditLog[]> {
    const { data } = await this.findFiltered({ limit, offset });
    return data;
  }

  async exportCsv(opts: {
    action?: string;
    targetType?: string;
    adminUserId?: string;
  }): Promise<string> {
    const { data } = await this.findFiltered({ ...opts, limit: 10000, offset: 0 });
    const header = 'createdAt,adminUserId,action,targetType,targetId,payload';
    const esc = (v: unknown): string => {
      const s = v == null ? '' : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = data.map((r) => {
      const ts = r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt);
      const payload = r.payload == null ? '' : JSON.stringify(r.payload);
      return [ts, r.adminUserId, r.action, r.targetType ?? '', r.targetId ?? '', payload]
        .map(esc)
        .join(',');
    });
    return [header, ...lines].join('\n');
  }

  async getStats(daysInput: number): Promise<AuditLogStats> {
    const days = Math.max(1, Math.min(90, Math.floor(daysInput) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const baseWhere = (alias: string) => `${alias}.createdAt >= :since`;

    const totalEntries = await this.repo
      .createQueryBuilder('log')
      .where(baseWhere('log'), { since })
      .getCount();

    // Per-day counts. Use SUBSTR on ISO datetime for SQLite-friendliness;
    // works on Postgres too because TypeORM serializes Date and SUBSTR is standard.
    const perDayRaw = await this.repo
      .createQueryBuilder('log')
      .select("SUBSTR(log.createdAt, 1, 10)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where(baseWhere('log'), { since })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; count: string | number }>();

    const entriesPerDay = perDayRaw.map((r) => ({
      date: String(r.date),
      count: Number(r.count),
    }));

    const topActionsRaw = await this.repo
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .where(baseWhere('log'), { since })
      .groupBy('log.action')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany<{ action: string; count: string | number }>();

    const topActions = topActionsRaw.map((r) => ({
      action: r.action,
      count: Number(r.count),
    }));

    const topAdminsRaw = await this.repo
      .createQueryBuilder('log')
      .select('log.adminUserId', 'adminUserId')
      .addSelect('COUNT(*)', 'count')
      .where(baseWhere('log'), { since })
      .groupBy('log.adminUserId')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany<{ adminUserId: string; count: string | number }>();

    const adminIds = topAdminsRaw.map((r) => r.adminUserId).filter(Boolean);
    const adminUsers = adminIds.length
      ? await this.userRepo
          .createQueryBuilder('u')
          .select(['u.id', 'u.fullName', 'u.email'])
          .whereInIds(adminIds)
          .getMany()
      : [];
    const nameMap = new Map<string, string>(
      adminUsers.map((u) => [u.id, u.fullName || u.email || u.id]),
    );

    const topAdmins = topAdminsRaw.map((r) => ({
      adminUserId: r.adminUserId,
      adminName: nameMap.get(r.adminUserId) || r.adminUserId,
      count: Number(r.count),
    }));

    const topTargetTypesRaw = await this.repo
      .createQueryBuilder('log')
      .select('log.targetType', 'targetType')
      .addSelect('COUNT(*)', 'count')
      .where(baseWhere('log'), { since })
      .andWhere('log.targetType IS NOT NULL')
      .groupBy('log.targetType')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany<{ targetType: string; count: string | number }>();

    const topTargetTypes = topTargetTypesRaw.map((r) => ({
      targetType: r.targetType,
      count: Number(r.count),
    }));

    return {
      totalEntries,
      entriesPerDay,
      topActions,
      topAdmins,
      topTargetTypes,
    };
  }
}
