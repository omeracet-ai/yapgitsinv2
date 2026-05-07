import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../users/user.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthUser } from '../../common/types/auth.types';
import { TwoFactorService } from './two-factor.service';
import { PasswordResetToken } from './password-reset-token.entity';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private twoFactorService: TwoFactorService,
    @InjectRepository(PasswordResetToken)
    private resetRepo: Repository<PasswordResetToken>,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async forgotPassword(email: string) {
    const generic = {
      success: true,
      message:
        'Eğer bu email kayıtlı ise sıfırlama bağlantısı gönderildi',
    } as { success: true; message: string; resetUrl?: string };

    if (!email) return generic;
    const user = await this.usersService.findByEmail(email);
    if (!user) return generic;

    const plain = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(plain);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.resetRepo.save(
      this.resetRepo.create({ userId: user.id, tokenHash, expiresAt, usedAt: null }),
    );

    const base = process.env.FRONTEND_URL ?? 'https://yapgitsin.tr';
    generic.resetUrl = `${base}/reset-password?token=${plain}`;
    return generic;
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Geçersiz veya süresi dolmuş kod');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Şifre en az 6 karakter olmalı');
    }
    const tokenHash = this.hashToken(token);
    const record = await this.resetRepo.findOne({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Geçersiz veya süresi dolmuş kod');
    }

    const passwordHash = await bcrypt.hash(newPassword, await bcrypt.genSalt());
    await this.usersService.update(record.userId, { passwordHash });

    const now = new Date();
    record.usedAt = now;
    await this.resetRepo.save(record);
    // Diğer aktif token'ları da geçersiz kıl
    await this.resetRepo
      .createQueryBuilder()
      .update(PasswordResetToken)
      .set({ usedAt: now })
      .where('userId = :uid AND usedAt IS NULL', { uid: record.userId })
      .execute();

    return { success: true };
  }

  async onModuleInit() {
    const adminEmail = 'admin@hizmet.app';
    const existing = await this.usersService.findByEmail(adminEmail);
    if (!existing) {
      const initialPassword =
        process.env.ADMIN_INITIAL_PASSWORD ?? 'change_me_now';
      const passwordHash = await bcrypt.hash(initialPassword, 10);
      await this.usersService.create({
        fullName: 'Admin',
        email: adminEmail,
        phoneNumber: '05000000000',
        passwordHash,
        role: UserRole.ADMIN,
        isPhoneVerified: true,
      });
    }
  }

  async validateUser(emailOrPhone: string, pass: string): Promise<AuthUser | null> {
    const user =
      (await this.usersService.findByEmail(emailOrPhone)) ??
      (await this.usersService.findByPhone(emailOrPhone));
    if (
      user &&
      user.passwordHash &&
      (await bcrypt.compare(pass, user.passwordHash))
    ) {
      const { passwordHash: _hash, ...result } = user;
      return result;
    }
    return null;
  }

  login(user: AuthUser) {
    if ((user as AuthUser & { twoFactorEnabled?: boolean }).twoFactorEnabled) {
      const tempToken = this.jwtService.sign(
        { sub: user.id, purpose: 'twofa' },
        { expiresIn: '5m' },
      );
      return { requires2FA: true, tempToken };
    }
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '30d' }),
      user,
    };
  }

  async loginVerify2fa(tempToken: string, code: string) {
    let payload: { sub: string; purpose: string };
    try {
      payload = this.jwtService.verify(tempToken);
    } catch {
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş token');
    }
    if (payload.purpose !== 'twofa') {
      throw new UnauthorizedException('Geçersiz token amacı');
    }
    const ok = await this.twoFactorService.verify(payload.sub, code);
    if (!ok) throw new UnauthorizedException('Kod yanlış');

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Kullanıcı bulunamadı');
    const { passwordHash: _h, ...result } = user;
    const tokenPayload = { email: result.email, sub: result.id, role: result.role };
    return {
      access_token: this.jwtService.sign(tokenPayload, { expiresIn: '30d' }),
      user: result,
    };
  }

  async adminLogin(username: string, password: string) {
    const email = username === 'admin' ? 'admin@hizmet.app' : username;
    const user = await this.usersService.findByEmail(email);
    if (!user || user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Geçersiz admin bilgileri');
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Geçersiz admin bilgileri');
    }
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '8h' }),
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async register(userData: {
    email?: string;
    phoneNumber: string;
    password: string;
    fullName?: string;
    birthDate?: string;
    gender?: string;
    city?: string;
    district?: string;
    address?: string;
  }) {
    const existingByEmail = userData.email
      ? await this.usersService.findByEmail(userData.email)
      : null;
    if (existingByEmail)
      throw new UnauthorizedException('Bu e-posta zaten kayıtlı');

    const existingByPhone = await this.usersService.findByPhone(
      userData.phoneNumber,
    );
    if (existingByPhone)
      throw new UnauthorizedException('Bu telefon numarası zaten kayıtlı');

    const passwordHash = await bcrypt.hash(
      userData.password,
      await bcrypt.genSalt(),
    );

    const newUser = await this.usersService.create({
      fullName: userData.fullName ?? 'Kullanıcı',
      email: userData.email,
      phoneNumber: userData.phoneNumber,
      passwordHash,
      birthDate: userData.birthDate,
      gender: userData.gender,
      city: userData.city,
      district: userData.district,
      address: userData.address,
      role: UserRole.USER,
      isPhoneVerified: true,
    });

    const { passwordHash: _hash2, ...result } = newUser;
    const payload = { email: result.email, sub: result.id, role: result.role };
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '30d' }),
      user: result,
    };
  }
}
