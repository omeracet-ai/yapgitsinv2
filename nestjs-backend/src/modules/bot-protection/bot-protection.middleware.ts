import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { BotProtectionService } from './bot-protection.service';

/**
 * Phase 438 — Global request gate.
 *
 * Rejects requests from:
 *   - IPs on the block list (DB-backed, 60s cached)
 *   - User-agents matching the scraper blacklist
 *
 * Exceptions: /health (status checks must pass even for blocked IPs so the
 * site stays observable) and /uploads (static file serving — already
 * IP-rate-limited via ThrottlerModule, and bot blocks here can be too
 * aggressive given CDN/proxy edge cases).
 */
@Injectable()
export class BotProtectionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(BotProtectionMiddleware.name);

  constructor(private bots: BotProtectionService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const path = req.path || req.url || '';
    if (path.startsWith('/health') || path.startsWith('/uploads')) {
      return next();
    }

    const ip = this.extractIp(req);
    const ua = (req.headers['user-agent'] as string | undefined) ?? '';

    // 1) UA blacklist (cheap, no DB)
    if (this.bots.isBotUserAgent(ua)) {
      this.logger.debug(`Blocked UA ${ua.slice(0, 80)} from ${ip}`);
      res.status(403).json({
        statusCode: 403,
        message: 'Bot user-agent rejected',
        error: 'Forbidden',
      });
      return;
    }

    // 2) IP block list (cached)
    const blocked = await this.bots.isBlocked(ip);
    if (blocked) {
      // Best-effort hit count (fire-and-forget)
      void this.bots.recordHit(ip, ua);
      res.status(403).json({
        statusCode: 403,
        message: 'IP blocked',
        error: 'Forbidden',
      });
      return;
    }

    next();
  }

  private extractIp(req: Request): string {
    // Plesk/IIS: X-Forwarded-For trusted only behind reverse proxy. For now
    // accept x-real-ip / x-forwarded-for (first hop) if present, fallback req.ip.
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length) {
      return xff.split(',')[0].trim();
    }
    const xri = req.headers['x-real-ip'];
    if (typeof xri === 'string' && xri.length) {
      return xri.trim();
    }
    return req.ip ?? req.socket?.remoteAddress ?? '';
  }
}
