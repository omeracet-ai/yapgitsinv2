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

  /**
   * Phase 182 — structured audit record. Fire-and-forget: never throws (audit
   * failures must NEVER break the underlying admin action). Captures actor
   * identity (id + denormalized email) plus request context (ip, UA).
   */
  async record(opts: {
    actor: { id: string; email?: string | null } | null;
    action: string;
    targetType?: string | null;
    targetId?: string | null;
    payload?: Record<string, unknown> | null;
    req?: { ip?: string; headers?: Record<string, unknown> } | null;
  }): Promise<void> {
    try {
      let actorEmail: string | null = opts.actor?.email ?? null;
      if (opts.actor?.id && !actorEmail) {
        const u = await this.userRepo.findOne({
          where: { id: opts.actor.id },
          select: ['id', 'email'],
        });
        actorEmail = u?.email ?? null;
      }
      const ua = opts.req?.headers?.['user-agent'];
      const fwd = opts.req?.headers?.['x-forwarded-for'];
      const ip =
        (typeof fwd === 'string' ? fwd.split(',')[0].trim() : null) ||
        opts.req?.ip ||
        null;
      const entity = this.repo.create({
        adminUserId: opts.actor?.id ?? null,
        actorEmail,
        action: opts.action,
        targetType: opts.targetType ?? null,
        targetId: opts.targetId ?? null,
        payload: opts.payload ?? null,
        ip: ip ? String(ip).slice(0, 64) : null,
        userAgent: typeof ua === 'string' ? ua.slice(0, 512) : null,
      });
      await this.repo.save(entity);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`[audit.record] failed: ${msg}`);
    }
  }

  async findOne(id: string): Promise<AdminAuditLog | null> {
    return this.repo.findOne({ where: { id } });
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

  private clampDays(input: number, min = 30, max = 365): number {
    const n = Math.floor(Number(input));
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  async previewPurge(
    olderThanDaysInput: number,
  ): Promise<{ wouldDelete: number; cutoffDate: string; olderThanDays: number }> {
    const olderThanDays = this.clampDays(olderThanDaysInput);
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const wouldDelete = await this.repo
      .createQueryBuilder('log')
      .where('log.createdAt < :cutoff', { cutoff })
      .getCount();
    return {
      wouldDelete,
      cutoffDate: cutoff.toISOString(),
      olderThanDays,
    };
  }

  async purgeOlderThan(
    olderThanDaysInput: number,
    adminUserId: string,
  ): Promise<{ deleted: number; cutoffDate: string; olderThanDays: number }> {
    const olderThanDays = this.clampDays(olderThanDaysInput);
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const result = await this.repo
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoff', { cutoff })
      .execute();
    const deleted = Number(result.affected ?? 0);
    const cutoffDate = cutoff.toISOString();
    // Audit the purge AFTER the delete so it isn't itself purged.
    await this.logAction(adminUserId, 'audit_log.purge', 'audit_log', undefined, {
      olderThanDays,
      deletedCount: deleted,
      cutoffDate,
    });
    return { deleted, cutoffDate, olderThanDays };
  }

  async getStats(daysInput: number): Promise<AuditLogStats> {
    const days = Math.max(1, Math.min(90, Math.floor(daysInput) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const baseWhere = (alias: string) => `${alias}.createdAt >= :since`;

    // Phase 175 — fan out all 5 independent aggregates in a single wave.
    const t0 = Date.now();
    const [totalEntries, perDayRaw, topActionsRaw, topAdminsRaw, topTargetTypesRaw] =
      await Promise.all([
        this.repo
          .createQueryBuilder('log')
          .where(baseWhere('log'), { since })
          .getCount(),
        // Per-day counts. SUBSTR on ISO datetime for SQLite-friendliness; works on
        // Postgres too because TypeORM serializes Date and SUBSTR is standard.
        this.repo
          .createQueryBuilder('log')
          .select('SUBSTR(log.createdAt, 1, 10)', 'date')
          .addSelect('COUNT(*)', 'count')
          .where(baseWhere('log'), { since })
          .groupBy('date')
          .orderBy('date', 'ASC')
          .getRawMany<{ date: string; count: string | number }>(),
        this.repo
          .createQueryBuilder('log')
          .select('log.action', 'action')
          .addSelect('COUNT(*)', 'count')
          .where(baseWhere('log'), { since })
          .groupBy('log.action')
          .orderBy('count', 'DESC')
          .limit(10)
          .getRawMany<{ action: string; count: string | number }>(),
        this.repo
          .createQueryBuilder('log')
          .select('log.adminUserId', 'adminUserId')
          .addSelect('COUNT(*)', 'count')
          .where(baseWhere('log'), { since })
          .groupBy('log.adminUserId')
          .orderBy('count', 'DESC')
          .limit(10)
          .getRawMany<{ adminUserId: string; count: string | number }>(),
        this.repo
          .createQueryBuilder('log')
          .select('log.targetType', 'targetType')
          .addSelect('COUNT(*)', 'count')
          .where(baseWhere('log'), { since })
          .andWhere('log.targetType IS NOT NULL')
          .groupBy('log.targetType')
          .orderBy('count', 'DESC')
          .limit(10)
          .getRawMany<{ targetType: string; count: string | number }>(),
      ]);

    const entriesPerDay = perDayRaw.map((r) => ({
      date: String(r.date),
      count: Number(r.count),
    }));

    const topActions = topActionsRaw.map((r) => ({
      action: r.action,
      count: Number(r.count),
    }));

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

    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[phase-175] getStats parallel ${Date.now() - t0}ms`);
    }

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
