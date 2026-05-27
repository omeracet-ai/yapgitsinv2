import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSetting } from './platform-setting.entity';
import { AdminAuditLog } from '../admin-audit/admin-audit-log.entity';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 60s

/**
 * Phase 254a — Platform settings (admin-configurable key/value store).
 * 60s in-process cache; invalidated on set().
 */
@Injectable()
export class PlatformSettingsService {
  private readonly logger = new Logger(PlatformSettingsService.name);
  private cache = new Map<string, CacheEntry>();

  constructor(
    @InjectRepository(PlatformSetting)
    private readonly repo: Repository<PlatformSetting>,
    @InjectRepository(AdminAuditLog)
    private readonly auditRepo: Repository<AdminAuditLog>,
  ) {}

  private readCache(key: string): string | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  private writeCache(key: string, value: string): void {
    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  async getString(key: string, defaultValue: string): Promise<string> {
    const cached = this.readCache(key);
    if (cached !== undefined) return cached;
    try {
      const row = await this.repo.findOne({ where: { key } });
      const value = row?.value ?? defaultValue;
      this.writeCache(key, value);
      return value;
    } catch (e) {
      this.logger.warn(
        `getString(${key}) failed, using default: ${e instanceof Error ? e.message : String(e)}`,
      );
      return defaultValue;
    }
  }

  async getNumber(key: string, defaultValue: number): Promise<number> {
    const raw = await this.getString(key, String(defaultValue));
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return defaultValue;
    return parsed;
  }

  async setValue(
    key: string,
    value: string,
    adminId?: string,
  ): Promise<PlatformSetting> {
    const existing = await this.repo.findOne({ where: { key } });
    const entity = existing
      ? Object.assign(existing, { value, updatedBy: adminId ?? null })
      : this.repo.create({ key, value, updatedBy: adminId ?? null });
    const saved = await this.repo.save(entity);

    // Cache invalidation
    this.cache.delete(key);

    // Best-effort audit log
    try {
      await this.auditRepo.save(
        this.auditRepo.create({
          adminUserId: adminId ?? null,
          action: 'platform_settings.update',
          targetType: 'platform_setting',
          targetId: key,
          payload: { key, value, previous: existing?.value ?? null },
        }),
      );
    } catch (e) {
      this.logger.warn(
        `audit log skipped for ${key}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    return saved;
  }

  async getAll(): Promise<PlatformSetting[]> {
    return this.repo.find({ order: { key: 'ASC' } });
  }

  invalidate(key?: string): void {
    if (key) this.cache.delete(key);
    else this.cache.clear();
  }

  // ------------- Phase 267 — Escrow typed accessors -------------
  // Admin-tunable knobs for the simplified confirmation flow. Defaults are
  // intentionally loose (gpsRequired=false, radius=1000m) to avoid false
  // negatives during early rollout.

  async getBoolean(key: string, defaultValue: boolean): Promise<boolean> {
    const raw = await this.getString(key, String(defaultValue));
    if (raw === 'true' || raw === '1') return true;
    if (raw === 'false' || raw === '0') return false;
    return defaultValue;
  }

  /** Escrow GPS match radius in meters. Default 1000m (loose). */
  getEscrowGpsRadiusM(): Promise<number> {
    return this.getNumber('escrow.gps_radius_m', 1000);
  }

  /** Whether GPS proximity is enforced at all. Default false (bypass). */
  getEscrowGpsRequired(): Promise<boolean> {
    return this.getBoolean('escrow.gps_required', false);
  }

  /** Grace window after both-side approval before finalization. Default 1hr. */
  getEscrowGraceMs(): Promise<number> {
    return this.getNumber('escrow.grace_ms', 60 * 60 * 1000);
  }

  /** Confirmation deadline from /start to mandatory dispute. Default 72hr. */
  getEscrowDeadlineMs(): Promise<number> {
    return this.getNumber('escrow.deadline_ms', 72 * 60 * 60 * 1000);
  }
}

