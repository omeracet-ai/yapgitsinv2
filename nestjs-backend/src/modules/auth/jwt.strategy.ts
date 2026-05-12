import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtPayload, AuthUser } from '../../common/types/auth.types';
import { UsersService } from '../users/users.service';
import { jwtSecretOrKeyProvider, getJwtSigningSecret } from './jwt-secrets';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    // Fail fast at boot if JWT_SECRET is missing.
    getJwtSigningSecret();
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Dual-secret verify: JWT_SECRET, then JWT_SECRET_PREVIOUS during rotation.
      secretOrKeyProvider: jwtSecretOrKeyProvider,
    });
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
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
