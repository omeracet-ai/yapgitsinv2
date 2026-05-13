import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { JwtPayload, AuthUser } from '../../common/types/auth.types';
import { UsersService } from '../users/users.service';
import { jwtSecretOrKeyProvider, getJwtSigningSecret } from './jwt-secrets';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /** Phase P191/4 — cache TTL for tokenVersion lookup (ms). */
  private static readonly TOKEN_VER_TTL_MS = 60_000;

  constructor(
    private readonly usersService: UsersService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    // Fail fast at boot if JWT_SECRET is missing.
    getJwtSigningSecret();
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Dual-secret verify: JWT_SECRET, then JWT_SECRET_PREVIOUS during rotation.
      secretOrKeyProvider: jwtSecretOrKeyProvider,
    });
  }

  /** Phase P191/4 — cache key for a user's current tokenVersion. */
  private cacheKey(userId: string): string {
    return `user:tokenVer:${userId}`;
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    // Phase 47 — suspended kullanıcıların token'ı reddedilir
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Kullanıcı bulunamadı');
    if (user.suspended) {
      throw new UnauthorizedException('Hesabınız askıya alındı');
    }
    // Phase 60 — silinmiş hesapların token'ı reddedilir
    if (user.deactivated) {
      throw new UnauthorizedException('Hesap silindi');
    }
    // Phase P191/4 — tokenVersion check (logout / refresh revokes by bumping it).
    // Legacy tokens without the claim default to 0 — only valid if user is still at 0.
    const tokenVer = payload.tokenVersion ?? 0;
    const currentVer = user.tokenVersion ?? 0;
    // Warm cache for downstream lookups; we already paid the DB hit here.
    await this.cacheManager.set(
      this.cacheKey(user.id),
      currentVer,
      JwtStrategy.TOKEN_VER_TTL_MS,
    );
    if (tokenVer !== currentVer) {
      throw new UnauthorizedException('Token revoked');
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      // Phase 160 — multi-tenant. Fallback to null for legacy tokens (no claim) so
      // existing sessions stay valid; null = default tenant downstream.
      tenantId: payload.tenantId ?? null,
    };
  }
}
