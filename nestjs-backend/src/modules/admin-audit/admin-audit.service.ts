import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLog } from './admin-audit-log.entity';

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly repo: Repository<AdminAuditLog>,
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
}
