/**
 * Phase 523 — RegisterThrottleGuard (success-only counter)
 *
 * Sorun: Önceki yaklaşım `@Throttle({ 'auth-register': { limit: 3, ttl: 3_600_000 } })`
 * decorator'ıydı. NestJS built-in ThrottlerGuard isteği route'a girer girmez sayar
 * — yani body validation 400 atsa bile bucket düşer. E2E agent 3 yanlış denemede
 * IP'yi 1 saat kilitliyordu. Üstelik döndürdüğü `Retry-After-Auth-Register` header
 * non-standard — hiçbir client honor etmez.
 *
 * Çözüm: response 'finish' event'inde counter — sadece 2xx (başarılı kayıt) +1
 * sayar. 4xx (validation, conflict) ve 5xx sayılmaz. Spam koruması korunur
 * (gerçekten 3 başarılı user/saat IP kuralı), ama hatalı denemeler ceza vermez.
 *
 * Header: standart `Retry-After` (saniye). `X-Throttle-Reason: register`.
 *
 * Pattern: LoginThrottleGuard ile aynı in-memory Map + sweep + onModuleDestroy.
 * Multi-node Redis backend sonraki phase.
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
  resetAt: number; // epoch ms
}

const WINDOW_MS = 3_600_000; // 1 saat
const MAX_REGISTRATIONS = 3; // başarılı kayıt sayısı
const CLEANUP_INTERVAL_MS = 5 * 60_000; // 5 dakikada bir expired temizlik

@Injectable()
export class RegisterThrottleGuard implements CanActivate, OnModuleDestroy {
  private readonly logger = new Logger(RegisterThrottleGuard.name);
  private readonly buckets = new Map<string, Bucket>();
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
    const now = Date.now();

    const bucket = this.buckets.get(ip);
    if (bucket && bucket.resetAt > now && bucket.count >= MAX_REGISTRATIONS) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      res.setHeader('X-Throttle-Reason', 'register');
      this.logger.warn(
        `RegisterThrottle ip=${ip} count=${bucket.count} retryAfter=${retryAfter}s`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message:
            'Bu IP adresinden çok fazla kayıt oluşturuldu. Lütfen biraz sonra tekrar deneyin.',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Defer counting — SADECE 2xx (başarılı kayıt) bucket'ı arttırır.
    // 400 (validation), 409 (conflict), 5xx → sayılmaz.
    res.on('finish', () => {
      const status = res.statusCode;
      if (status >= 200 && status < 300) {
        this.bump(ip, now);
      }
    });

    return true;
  }

  private bump(key: string, now: number): void {
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    } else {
      existing.count += 1;
    }
  }

  private sweep(): void {
    const now = Date.now();
    for (const [k, b] of this.buckets) {
      if (b.resetAt <= now) this.buckets.delete(k);
    }
  }

  private extractIp(req: Request): string {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length > 0) {
      return xff.split(',')[0].trim();
    }
    if (Array.isArray(xff) && xff.length > 0) return xff[0];
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
}
