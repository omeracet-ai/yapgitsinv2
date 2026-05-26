import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { AdminAuditService } from '../admin-audit/admin-audit.service';

/**
 * Phase 255 (Voldi-fs) — Account hard-delete cron.
 *
 * Daily 03:00. Finds users whose `scheduledHardDeleteAt < now` AND `deletedAt IS NOT NULL`,
 * then hard-deletes (or, if FK constraints prevent removal, PII-anonymizes as a fallback).
 *
 * Strategy per user:
 *   1. Try `repo.delete(id)` — FK cascade on dependent tables removes rows.
 *   2. On QueryFailedError (FK violation) anonymize PII + keep row to maintain referential integrity.
 *
 * NOTE: `deletedAt` ve `scheduledHardDeleteAt` kolonları Voldi-db migration ile
 * `users` tablosuna eklenir. Bu task kolonların varlığını assume eder.
 */
@Injectable()
export class UsersCleanupTask {
  private readonly logger = new Logger(UsersCleanupTask.name);

  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    private readonly audit: AdminAuditService,
  ) {}

  /** Günlük 03:00 — TZ varsayılan server saati. */
  @Cron('0 3 * * *')
  async sweepExpiredSoftDeletes(): Promise<void> {
    const now = new Date();
    let candidates: User[] = [];
    try {
      candidates = await this.repo
        .createQueryBuilder('u')
        .where('u.scheduledHardDeleteAt IS NOT NULL')
        .andWhere('u.deletedAt IS NOT NULL')
        .andWhere('u.scheduledHardDeleteAt < :now', { now })
        .limit(500)
        .getMany();
    } catch (e) {
      this.logger.warn(
        `[UsersCleanupTask] sweep query failed (migration eksik olabilir): ${
          (e as Error).message
        }`,
      );
      return;
    }

    if (candidates.length === 0) {
      this.logger.debug(`[UsersCleanupTask] no candidates`);
      return;
    }
    this.logger.log(
      `[UsersCleanupTask] ${candidates.length} hesap hard-delete adayı`,
    );

    let hardDeleted = 0;
    let anonymized = 0;
    for (const user of candidates) {
      const id = user.id;
      try {
        await this.repo.delete(id);
        hardDeleted++;
        await this.safeAudit(id, 'account.hard_delete', { mode: 'delete' });
      } catch (err) {
        // FK violation veya benzeri: PII anonymize fallback.
        try {
          await this.anonymize(user);
          anonymized++;
          await this.safeAudit(id, 'account.hard_delete', {
            mode: 'anonymize',
            reason: (err as Error).message,
          });
        } catch (anonErr) {
          this.logger.error(
            `[UsersCleanupTask] anonymize failed for ${id}: ${
              (anonErr as Error).message
            }`,
          );
        }
      }
    }

    this.logger.log(
      `[UsersCleanupTask] done — hardDeleted=${hardDeleted}, anonymized=${anonymized}`,
    );
  }

  private async anonymize(user: User): Promise<void> {
    const patch: Record<string, unknown> = {
      email: `deleted_${user.id}@yapgitsin.tr`,
      fullName: 'Silinmiş Kullanıcı',
      phoneNumber: null,
      passwordHash: null,
      profileImageUrl: null,
      identityPhotoUrl: null,
      documentPhotoUrl: null,
      identityVerified: false,
      workerBio: null,
      address: null,
      latitude: null,
      longitude: null,
      fcmTokens: null,
      firebaseUid: null,
      defaultIban: null,
      defaultAccountHolderName: null,
      deactivated: true,
    };
    await this.repo.update(user.id, patch);
  }

  private async safeAudit(
    userId: string,
    action: string,
    meta: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.audit.logAction(userId, action, 'user', userId, meta);
    } catch (e) {
      this.logger.warn(
        `[UsersCleanupTask] audit log failed: ${(e as Error).message}`,
      );
    }
  }
}
