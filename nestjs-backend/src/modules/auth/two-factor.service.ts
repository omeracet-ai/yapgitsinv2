import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { UsersService } from '../users/users.service';

@Injectable()
export class TwoFactorService {
  constructor(private readonly usersService: UsersService) {}

  async setup(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

    const secret = authenticator.generateSecret();
    await this.usersService.update(userId, {
      twoFactorSecret: secret,
      twoFactorEnabled: false,
    });

    const accountName = user.email || user.phoneNumber;
    const otpauthUrl = authenticator.keyuri(accountName, 'Yapgitsin', secret);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    return { secret, otpauthUrl, qrDataUrl };
  }

  async enable(userId: string, token: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    if (!user.twoFactorSecret) {
      throw new BadRequestException('Önce 2FA setup yapılmalı');
    }
    const ok = authenticator.check(token, user.twoFactorSecret);
    if (!ok) throw new BadRequestException('Kod yanlış');

    await this.usersService.update(userId, { twoFactorEnabled: true });
    return { enabled: true };
  }

  async disable(userId: string, token: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('2FA aktif değil');
    }
    const ok = authenticator.check(token, user.twoFactorSecret);
    if (!ok) throw new BadRequestException('Kod yanlış');

    await this.usersService.update(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });
    return { enabled: false };
  }

  async verify(userId: string, token: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.twoFactorSecret) return false;
    return authenticator.check(token, user.twoFactorSecret);
  }
}
