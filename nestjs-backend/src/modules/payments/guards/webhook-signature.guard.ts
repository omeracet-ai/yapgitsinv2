import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import type { Request } from 'express';

/**
 * Phase 245 (Voldi-sec) — Payment provider webhook signature guard.
 *
 * Webhook endpoint'i unauthenticated POST kabul ediyor (provider → bize). Bu
 * yüzden ASIL güvenlik katmanı **imza doğrulamadır**. İmza yoksa saldırgan
 * keyfi `payment.completed` event'i göndererek herhangi bir paymentIntent'i
 * COMPLETED yapabilir.
 *
 * Strateji:
 *   - Beklenen header: `X-Webhook-Signature` veya `X-Iyzipay-Signature`.
 *   - HMAC-SHA256(secret, JSON.stringify(body)) hex.
 *   - Timing-safe compare (`crypto.timingSafeEqual`).
 *
 * Secret kaynakları (önce hangisi tanımlıysa):
 *   - `PAYMENTS_WEBHOOK_SECRET` (generic, tercih edilen)
 *   - `IYZICO_WEBHOOK_SECRET` (iyzipay specific)
 *
 * Fail mode:
 *   - Secret tanımsız + NODE_ENV=production → 503 (fail-closed, prod misconfig'i
 *     tespit edilebilir bir hatayla yüzeye çıkarır).
 *   - Secret tanımsız + non-prod → bypass + warn log (lokal dev / e2e test
 *     için; setup-e2e.ts ortamında secret yok).
 *   - Secret var ama header yok / mismatch → 403.
 *
 * NOT: iyzipay'in resmi SDK'sı şu an webhook signature verification method'u
 * dokümante etmiyor (iyzipay/callback re-verify pattern'i checkout token üzerinden
 * çalışıyor). Bu guard generic `/payments/webhook` endpoint'i içindir.
 */
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const secret =
      process.env.PAYMENTS_WEBHOOK_SECRET ||
      process.env.IYZICO_WEBHOOK_SECRET ||
      '';

    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          'webhook signature secret missing in production (set PAYMENTS_WEBHOOK_SECRET)',
        );
        throw new ServiceUnavailableException(
          'Webhook signature secret is not configured',
        );
      }
      this.logger.warn(
        'webhook signature secret missing — bypassing verification (non-prod)',
      );
      return true;
    }

    const headerSig =
      (req.headers['x-webhook-signature'] as string | undefined) ||
      (req.headers['x-iyzipay-signature'] as string | undefined) ||
      '';
    if (!headerSig) {
      throw new ForbiddenException('Missing webhook signature header');
    }

    const body = (req as unknown as { body: unknown }).body ?? {};
    const payload = JSON.stringify(body);
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(headerSig, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      this.logger.warn(
        `webhook signature mismatch (path=${req.path}, ip=${req.ip ?? 'n/a'})`,
      );
      throw new ForbiddenException('Invalid webhook signature');
    }
    return true;
  }
}
