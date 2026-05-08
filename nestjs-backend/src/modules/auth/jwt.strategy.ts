import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtPayload, AuthUser } from '../../common/types/auth.types';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET ortam değişkeni tanımlanmamış');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    // Phase 47 — suspended kullanıcıların token'ı reddedilir
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Kullanıcı bulunamadı');
    if (user.suspended) {
      throw new UnauthorizedException('Hesabınız askıya alındı');
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
