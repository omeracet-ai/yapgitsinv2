import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { BlockedIp } from './blocked-ip.entity';

/**
 * Phase 438 — Bot Protection service.
 *
 * Two layers:
 *   1) IP block list (DB-backed, manual + auto-detect)
 *   2) User-Agent blacklist (regex match against known scrapers)
 *
 * Performance: 60s in-memory cache for IP lookups (90% requests hit cache).
 * Cache invalidated on block()/unblock() write.
 */

const UA_BLACKLIST = [
  // SEO/marketing scrapers
  /ahrefsbot/i,
  /semrushbot/i,
  /mj12bot/i,
  /dotbot/i,
  /yandexbot/i,
  /petalbot/i,
  // AI crawlers (often respect robots but verify)
  /gptbot/i,
  /chatgpt-user/i,
  /claudebot/i,
  /anthropic-ai/i,
  /perplexitybot/i,
  /amazonbot/i,
  /bytespider/i,
  // Generic scraper UA fingerprints
  /scrapy/i,
  /python-requests/i,
  /python-urllib/i,
  /curl\//i,
  /wget\//i,
  /^okhttp/i, // raw OkHttp without app context = bot
];

@Injectable()
export class BotProtectionService {
  private readonly logger = new Logger(BotProtectionService.name);
  private cache = new Map<string, { blocked: boolean; expiresAtMs: number }>();
  private readonly CACHE_TTL_MS = 60_000;

  // Phase 443 — sliding-window per-IP hit tracker for auto-detect.
  // Map<ip, timestamps[]>. trimWindow drops entries older than WINDOW_MS.
  // Threshold breach → auto-block 1h with reason 'auto:rate-flood'.
  private hits = new Map<string, number[]>();
  private readonly WINDOW_MS = 60_000; // 1 dakika
  private readonly THRESHOLD = 100; // 100 req/dk = bot

  constructor(
    @InjectRepository(BlockedIp)
    private blockedRepo: Repository<BlockedIp>,
  ) {}

  /**
   * Phase 443 — call from middleware on every pass. If IP exceeds threshold
   * within window, auto-block for 1h. Returns true if newly blocked.
   */
  async trackAndMaybeBlock(ip: string, userAgent: string): Promise<boolean> {
    if (!ip) return false;
    const now = Date.now();
    const cutoff = now - this.WINDOW_MS;
    let arr = this.hits.get(ip);
    if (!arr) {
      arr = [];
      this.hits.set(ip, arr);
    }
    // append + trim
    arr.push(now);
    while (arr.length && arr[0] < cutoff) arr.shift();
    if (arr.length < this.THRESHOLD) return false;
    // Threshold breach — auto-block
    this.hits.delete(ip);
    try {
      await this.block(
        ip,
        `auto:rate-flood ${arr.length}/dk`,
        'system',
        1,
        userAgent,
      );
      this.logger.warn(
        `Auto-blocked ${ip} (${arr.length} req/min, UA=${userAgent.slice(0, 60)})`,
      );
      return true;
    } catch (err) {
      this.logger.warn(`Auto-block failed: ${(err as Error).message}`);
      return false;
    }
  }

  /** UA pattern check — synchronous, no DB. */
  isBotUserAgent(ua: string | undefined): boolean {
    if (!ua || ua.length < 3) return true; // empty UA = bot
    return UA_BLACKLIST.some((re) => re.test(ua));
  }

  /** IP block check with 60s in-memory cache. */
  async isBlocked(ip: string): Promise<boolean> {
    if (!ip) return false;
    const now = Date.now();
    const cached = this.cache.get(ip);
    if (cached && cached.expiresAtMs > now) {
      return cached.blocked;
    }
    let blocked = false;
    try {
      const row = await this.blockedRepo.findOne({
        where: { ip },
        select: ['id', 'expiresAt'],
      });
      if (row) {
        if (!row.expiresAt || row.expiresAt.getTime() > now) {
          blocked = true;
        }
      }
    } catch (err) {
      this.logger.warn(`isBlocked check failed: ${(err as Error).message}`);
    }
    this.cache.set(ip, { blocked, expiresAtMs: now + this.CACHE_TTL_MS });
    return blocked;
  }

  async recordHit(ip: string, userAgent: string): Promise<void> {
    if (!ip) return;
    try {
      await this.blockedRepo
        .createQueryBuilder()
        .update(BlockedIp)
        .set({
          hitCount: () => 'hit_count + 1',
          lastUserAgent: userAgent.slice(0, 500),
        })
        .where('ip = :ip', { ip })
        .execute();
    } catch (err) {
      // Best-effort — middleware shouldn't fail if write fails
      this.logger.debug(`recordHit failed: ${(err as Error).message}`);
    }
  }

  async block(
    ip: string,
    reason: string,
    blockedBy: string,
    durationHours: number | null = null,
    userAgent = '',
  ): Promise<BlockedIp> {
    const existing = await this.blockedRepo.findOne({ where: { ip } });
    const expiresAt =
      durationHours !== null
        ? new Date(Date.now() + durationHours * 3_600_000)
        : null;
    if (existing) {
      existing.reason = reason.slice(0, 255);
      existing.expiresAt = expiresAt;
      existing.blockedBy = blockedBy.slice(0, 64);
      existing.lastUserAgent = userAgent.slice(0, 500);
      await this.blockedRepo.save(existing);
      this.cache.delete(ip);
      return existing;
    }
    const row = this.blockedRepo.create({
      ip: ip.slice(0, 64),
      reason: reason.slice(0, 255),
      expiresAt,
      blockedBy: blockedBy.slice(0, 64),
      lastUserAgent: userAgent.slice(0, 500),
      hitCount: 0,
    });
    await this.blockedRepo.save(row);
    this.cache.delete(ip);
    this.logger.log(
      `IP blocked: ${ip} (by ${blockedBy}, reason: ${reason}, expires: ${expiresAt?.toISOString() ?? 'permanent'})`,
    );
    return row;
  }

  async unblock(id: string): Promise<void> {
    const row = await this.blockedRepo.findOne({ where: { id } });
    if (!row) return;
    await this.blockedRepo.delete(id);
    this.cache.delete(row.ip);
    this.logger.log(`IP unblocked: ${row.ip}`);
  }

  async list(limit = 100): Promise<BlockedIp[]> {
    return this.blockedRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Cron-style cleanup of expired blocks. Call from cron job.
   */
  async purgeExpired(): Promise<number> {
    try {
      const res = await this.blockedRepo.delete({
        expiresAt: LessThan(new Date()),
      });
      const n = res.affected ?? 0;
      if (n > 0) {
        this.cache.clear();
        this.logger.log(`Purged ${n} expired IP block(s)`);
      }
      return n;
    } catch (err) {
      this.logger.warn(`purgeExpired failed: ${(err as Error).message}`);
      return 0;
    }
  }
}
