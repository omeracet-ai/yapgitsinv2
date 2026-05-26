/**
 * Phase 255b — LoginThrottleGuard (Hardened, two-layer + account lock aware)
 *
 * Brute-force / credential-stuffing koruması:
 *
 *  Layer 1 — Granular bucket (ip + ':' + identifier)
 *     3 başarısız deneme / 60s. Başarılı login bucket'ı resetler.
 *     Hit → 429 Too Many Requests + Retry-After header.
 *
 *  Layer 2 — IP umbrella bucket (sadece ip)
 *     50 başarısız deneme / 60s. Credential stuffing'i hedefler
 *     (tek IP'den çok farklı email/username denemesi).
 *     Hit → 429 + `X-Throttle-Reason: ip-umbrella` header.
 *
 *  Account lock (auth.service.ts içinde uygulanır — bu guard'ın haberi yok):
 *     5 ardışık başarısız deneme → User.lockedUntil = now + 15dk.
 *     Service 423 Locked fırlatır; guard buna karışmaz.
 *
 * Strateji:
 *  - canActivate: her iki bucket'ı kontrol et; biri tetiklenmişse blokla.
 *  - response 'finish' event'inde:
 *       2xx → her iki bucket'ı resetle (granular delete + umbrella decrement
 *              değil, granular delete yeter — başarılı login zaten meşrudur).
 *       4xx/5xx (429 hariç) → her iki bucket'ı +1.
 *  - cleanupInterval: 60s'de bir expired bucket'ları temizler (memory leak fix).
 *
 * In-memory Map (single-instance). Multi-node deployment için Redis backend
 * sonraki phase. Module singleton scope; setInterval onModuleDestroy ile
 * temizlenir.
 */
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface Bucket {
  count: number;
  resetAt: number; // epoch ms — bucket'ın expire ettiği an
}

const WINDOW_MS = 60_000; // 60 saniye
const GRANULAR_MAX = 3; // ip+identifier
const UMBRELLA_MAX = 50; // sadece ip
const CLEANUP_INTERVAL_MS = 60_000;

@Injectable()
export class LoginThrottleGuard implements CanActivate, OnModuleDestroy {
  private readonly logger = new Logger(LoginThrottleGuard.name);
  private readonly granular = new Map<string, Bucket>();
  private readonly umbrella = new Map<string, Bucket>();
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor() {
    this.cleanupTimer = setInterval(
      () => this.sweep(),
      CLEANUP_INTERVAL_MS,
    ).unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
  }

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    if (req.method === 'OPTIONS') return true;

    const ip = this.extractIp(req);
    const identifier = this.extractIdentifier(req);
    const granularKey = `${ip}:${identifier.toLowerCase()}`;
    const umbrellaKey = ip;
    const now = Date.now();

    // Layer 2 first — broader signal (single IP hammering many accounts).
    const umbBucket = this.umbrella.get(umbrellaKey);
    if (
      umbBucket &&
      umbBucket.resetAt > now &&
      umbBucket.count >= UMBRELLA_MAX
    ) {
      const retryAfter = Math.max(
        1,
        Math.ceil((umbBucket.resetAt - now) / 1000),
      );
      res.setHeader('Retry-After', String(retryAfter));
      res.setHeader('X-Throttle-Reason', 'ip-umbrella');
      this.logger.warn(
        `LoginThrottle UMBRELLA ip=${ip} count=${umbBucket.count} retryAfter=${retryAfter}s`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message:
            'Bu ağdan çok fazla başarısız giriş denemesi. Lütfen biraz sonra tekrar deneyin.',
          retryAfter,
          reason: 'ip-umbrella',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Layer 1 — granular (ip + identifier)
    const granBucket = this.granular.get(granularKey);
    if (
      granBucket &&
      granBucket.resetAt > now &&
      granBucket.count >= GRANULAR_MAX
    ) {
      const retryAfter = Math.max(
        1,
        Math.ceil((granBucket.resetAt - now) / 1000),
      );
      res.setHeader('Retry-After', String(retryAfter));
      this.logger.warn(
        `LoginThrottle GRANULAR key=${this.redact(granularKey)} retryAfter=${retryAfter}s`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message:
            'Çok fazla başarısız deneme. Lütfen biraz sonra tekrar deneyin.',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Defer counting — only failed (4xx/5xx, !=429) responses increment;
    // 2xx clears the granular bucket (umbrella keeps history briefly).
    res.on('finish', () => {
      const status = res.statusCode;
      if (status >= 200 && status < 300) {
        this.granular.delete(granularKey);
        return;
      }
      // 429 itself: don't double-count.
      if (status === HttpStatus.TOO_MANY_REQUESTS) return;
      // 423 Locked: account lock came from service; still count IP umbrella.
      this.bump(this.granular, granularKey, now);
      this.bump(this.umbrella, umbrellaKey, now);
    });

    return true;
  }

  private bump(store: Map<string, Bucket>, key: string, now: number): void {
    const existing = store.get(key);
    if (!existing || existing.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    } else {
      existing.count += 1;
    }
  }

  /** Expired bucket cleanup — kept minimal so it never blocks event loop. */
  private sweep(): void {
    const now = Date.now();
    for (const [k, b] of this.granular) {
      if (b.resetAt <= now) this.granular.delete(k);
    }
    for (const [k, b] of this.umbrella) {
      if (b.resetAt <= now) this.umbrella.delete(k);
    }
  }

  private extractIdentifier(req: Request): string {
    const body = (req.body ?? {}) as Record<string, unknown>;
    return (
      this.str(body.email) ||
      this.str(body.username) ||
      this.str(body.phone) ||
      this.str(body.phoneNumber) ||
      ''
    );
  }

  private extractIp(req: Request): string {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length > 0) {
      return xff.split(',')[0].trim();
    }
    if (Array.isArray(xff) && xff.length > 0) return xff[0];
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  private str(v: unknown): string {
    return typeof v === 'string' ? v : '';
  }

  /** Redact identifier for logs — keep first 3 chars. */
  private redact(key: string): string {
    const idx = key.indexOf(':');
    if (idx < 0) return key;
    const ip = key.slice(0, idx);
    const ident = key.slice(idx + 1);
    if (!ident) return `${ip}:<anon>`;
    if (ident.length <= 3) return `${ip}:${ident[0]}**`;
    return `${ip}:${ident.slice(0, 3)}***`;
  }
}
