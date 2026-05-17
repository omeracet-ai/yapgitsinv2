import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { promises as dns } from 'dns';

/**
 * Phase 253 (Voldi-email-validate) — Email domain validation on register.
 *
 * Pipeline (in order):
 *   1. Syntax (RFC-lite, handled upstream by class-validator @IsEmail).
 *   2. Disposable block (curated set ~50 domains).
 *   3. Whitelist fast-path (~30 well-known ISPs + project domain).
 *   4. MX record check via dns/promises.resolveMx(). 0 records → reject.
 *
 * Implementation notes:
 * - No new package.json deps; uses Node built-in dns/promises.
 * - In-memory MX cache: Map<domain, {ok: boolean, ts: number}>, TTL 24h,
 *   max 1000 entries (FIFO eviction).
 * - Error codes are stable; UI maps them to Turkish copy.
 */

const WHITELIST = new Set<string>([
  'gmail.com',
  'googlemail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'hotmail.com',
  'hotmail.com.tr',
  'outlook.com',
  'outlook.com.tr',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.com.tr',
  'ymail.com',
  'yandex.com',
  'yandex.com.tr',
  'mail.ru',
  'gmx.com',
  'gmx.net',
  'gmx.de',
  'protonmail.com',
  'proton.me',
  'tutanota.com',
  'fastmail.com',
  'zoho.com',
  'aol.com',
  'aim.com',
  'mynet.com',
  'superonline.com',
  'ttmail.com',
  // Project domain.
  'yapgitsin.tr',
]);

const DISPOSABLE = new Set<string>([
  '10minutemail.com',
  '10minutemail.net',
  '20minutemail.com',
  'tempmail.com',
  'tempmail.net',
  'tempmail.io',
  'temp-mail.org',
  'temp-mail.io',
  'tmpmail.org',
  'tmpmail.net',
  'mailinator.com',
  'mailinator.net',
  'mailinator2.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'guerrillamail.de',
  'sharklasers.com',
  'grr.la',
  'throwaway.email',
  'throwawaymail.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'fakeinbox.com',
  'fakemailgenerator.com',
  'mailcatch.com',
  'mintemail.com',
  'trashmail.com',
  'trashmail.net',
  'trashmail.de',
  'getairmail.com',
  'getnada.com',
  'nada.email',
  'mohmal.com',
  'maildrop.cc',
  'dispostable.com',
  'spambog.com',
  'spam4.me',
  'mailnesia.com',
  'mailnull.com',
  'mailtothis.com',
  'inboxbear.com',
  'tempinbox.com',
  'discard.email',
  'discardmail.com',
  'emailondeck.com',
  'jetable.org',
  'mvrht.net',
  'spamgourmet.com',
  'tempr.email',
]);

interface MxCacheEntry {
  ok: boolean;
  ts: number;
}

const MX_TTL_MS = 24 * 60 * 60 * 1000;
const MX_CACHE_MAX = 1000;

@Injectable()
export class EmailValidatorService {
  private readonly logger = new Logger(EmailValidatorService.name);
  private readonly mxCache = new Map<string, MxCacheEntry>();

  /** Static accessor for tests / size reporting. */
  static whitelistSize(): number {
    return WHITELIST.size;
  }
  static disposableSize(): number {
    return DISPOSABLE.size;
  }

  /**
   * Validates the email's domain. Throws BadRequestException with a stable
   * `code` (EMAIL_DOMAIN_INVALID / EMAIL_DISPOSABLE) on rejection.
   * Pass-through (no-op) if email is empty / undefined.
   */
  async validate(email: string | undefined | null): Promise<void> {
    if (!email) return;
    const at = email.lastIndexOf('@');
    if (at <= 0 || at === email.length - 1) {
      throw new BadRequestException({
        code: 'EMAIL_DOMAIN_INVALID',
        message: 'Bu e-posta sağlayıcısı doğrulanamadı',
      });
    }
    const domain = email.slice(at + 1).toLowerCase().trim();

    // 1. Disposable block (before whitelist so collisions are caught).
    if (DISPOSABLE.has(domain)) {
      throw new BadRequestException({
        code: 'EMAIL_DISPOSABLE',
        message: 'Geçici e-posta servisleri kullanılamaz',
      });
    }

    // 2. Whitelist fast-path.
    if (WHITELIST.has(domain)) return;

    // 3. MX cache hit?
    const cached = this.mxCache.get(domain);
    const now = Date.now();
    if (cached && now - cached.ts < MX_TTL_MS) {
      if (!cached.ok) {
        throw new BadRequestException({
          code: 'EMAIL_DOMAIN_INVALID',
          message: 'Bu e-posta sağlayıcısı doğrulanamadı',
        });
      }
      return;
    }

    // 4. MX lookup.
    let ok = false;
    try {
      const records = await dns.resolveMx(domain);
      ok = Array.isArray(records) && records.length > 0;
    } catch (err) {
      this.logger.debug(
        `MX lookup failed for ${domain}: ${(err as Error).message}`,
      );
      ok = false;
    }

    this.rememberMx(domain, ok);

    if (!ok) {
      throw new BadRequestException({
        code: 'EMAIL_DOMAIN_INVALID',
        message: 'Bu e-posta sağlayıcısı doğrulanamadı',
      });
    }
  }

  private rememberMx(domain: string, ok: boolean): void {
    if (this.mxCache.size >= MX_CACHE_MAX) {
      // FIFO eviction: drop the oldest insertion (Map iteration order).
      const firstKey = this.mxCache.keys().next().value;
      if (firstKey !== undefined) this.mxCache.delete(firstKey);
    }
    this.mxCache.set(domain, { ok, ts: Date.now() });
  }
}
