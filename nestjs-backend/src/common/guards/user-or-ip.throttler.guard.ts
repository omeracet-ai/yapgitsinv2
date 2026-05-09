/**
 * Phase 170 — User-or-IP ThrottlerGuard.
 *
 * Default ThrottlerGuard IP tracker'ı kullanır. JWT taşıyan istekler için
 * tracker'ı `user:<sub>` olarak değiştirir; böylece NAT arkasındaki birden fazla
 * kullanıcı birbirinin kotasını yemez ve tek bir kullanıcı IP değiştirerek
 * limit'i atlatamaz. Default global guard (AppModule APP_GUARD) yerine geçer.
 */
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class UserOrIpThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req?.user as { sub?: string; id?: string } | undefined;
    const sub = user?.sub ?? user?.id;
    if (sub) return Promise.resolve(`user:${String(sub)}`);
    const headers = (req?.headers ?? {}) as Record<string, string | string[] | undefined>;
    const xff = headers['x-forwarded-for'];
    const xffStr = Array.isArray(xff) ? xff[0] : xff;
    const ip =
      xffStr?.split(',')[0]?.trim() ??
      (typeof req?.ip === 'string' ? (req.ip as string) : 'unknown');
    return Promise.resolve(`ip:${ip}`);
  }
}
