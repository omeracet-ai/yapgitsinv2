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

  async findRecent(limit = 100, offset = 0): Promise<AdminAuditLog[]> {
    return this.repo.find({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }
}
