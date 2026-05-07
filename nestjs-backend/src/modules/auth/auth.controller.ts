import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private twoFactorService: TwoFactorService,
  ) {}

  /** Kullanıcı / işçi girişi */
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) throw new UnauthorizedException('E-posta veya şifre hatalı');
    return this.authService.login(user);
  }

  /** Admin girişi  –  username: "admin"  password: "admin" */
  @Post('admin/login')
  adminLogin(@Body() body: { username: string; password: string }) {
    return this.authService.adminLogin(body.username, body.password);
  }

  /** Yeni kullanıcı / işçi kaydı */
  @Post('register')
  register(
    @Body()
    body: {
      email?: string;
      phoneNumber: string;
      password: string;
      fullName?: string;
      birthDate?: string;
      gender?: string;
      city?: string;
      district?: string;
      address?: string;
    },
  ) {
    return this.authService.register(body);
  }

  // ── 2FA ────────────────────────────────────────────────────────────────
  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/setup')
  setup2fa(@Req() req: AuthenticatedRequest) {
    return this.twoFactorService.setup(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/enable')
  enable2fa(@Req() req: AuthenticatedRequest, @Body() body: { code: string }) {
    return this.twoFactorService.enable(req.user.id, body.code);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/disable')
  disable2fa(@Req() req: AuthenticatedRequest, @Body() body: { code: string }) {
    return this.twoFactorService.disable(req.user.id, body.code);
  }

  @Post('2fa/login-verify')
  loginVerify2fa(@Body() body: { tempToken: string; code: string }) {
    return this.authService.loginVerify2fa(body.tempToken, body.code);
  }

  /** Şifre sıfırlama isteği — generic response (privacy) */
  @Post('forgot-password')
  forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body?.email);
  }

  /** Şifre sıfırlama */
  @Post('reset-password')
  resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body?.token, body?.newPassword);
  }

  /** Email doğrulama isteği */
  @UseGuards(AuthGuard('jwt'))
  @Post('verify-email/request')
  requestEmailVerification(@Req() req: AuthenticatedRequest) {
    return this.authService.requestEmailVerification(req.user.id);
  }

  /** Email doğrulama onayı */
  @Post('verify-email/confirm')
  confirmEmailVerification(@Body() body: { token: string }) {
    return this.authService.confirmEmailVerification(body?.token);
  }
}
