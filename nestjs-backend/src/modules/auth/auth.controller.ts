import {
  Controller,
  Post,
  Body,
  HttpCode,
  UnauthorizedException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { FirebaseLoginDto } from './dto/firebase-login.dto';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestSmsOtpDto, VerifySmsOtpDto } from './dto/sms-otp.dto';
import {
  Enable2faDto,
  Disable2faDto,
  LoginVerify2faDto,
} from './dto/two-factor.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private twoFactorService: TwoFactorService,
  ) {}

  /** Kullanıcı / işçi girişi — Phase 170: 20 req/dk per IP (brute-force koruma) */
  @Throttle({ 'auth-login': { limit: 20, ttl: 60_000 } })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('E-posta veya şifre hatalı');
    return this.authService.login(user);
  }

  /**
   * Phase 226 (Voldi-sec) — Social sign-in JWT bridge.
   *
   * Client (Google/Apple via Firebase Auth) sends the Firebase ID token,
   * backend verifies via firebase-admin, upserts the user row, and issues
   * a backend JWT pair matching the /auth/login response shape.
   *
   * Throttle: 20 req/dk per IP — same budget as /auth/login since token
   * verify is server-side cryptographic work and brute-forcing a valid
   * Firebase token is infeasible, but we still want a ceiling.
   */
  @Throttle({ 'auth-login': { limit: 20, ttl: 60_000 } })
  @Post('firebase')
  async firebaseLogin(@Body() dto: FirebaseLoginDto) {
    return this.authService.loginWithFirebase(dto.idToken);
  }

  /**
   * Phase P188/4 (Voldi-sec) — Refresh access+refresh tokens.
   * 10 req/dk per IP — refresh shouldn't be hot.
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  /**
   * Phase P191/4 (Voldi-sec) — Logout: bump tokenVersion to invalidate
   * all outstanding access + refresh tokens for the current user.
   * Returns 204 No Content.
   */
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(204)
  @Post('logout')
  async logout(@Req() req: AuthenticatedRequest): Promise<void> {
    await this.authService.bumpTokenVersion(req.user.id);
  }

  /** Admin girişi  –  username: "admin"  password: "admin" */
  @Throttle({ 'auth-login': { limit: 20, ttl: 60_000 } })
  @Post('admin/login')
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto.username, dto.password);
  }

  /** Yeni kullanıcı / işçi kaydı — Phase 170: 3 req/saat per IP (spam koruma) */
  @Throttle({ 'auth-register': { limit: 3, ttl: 3_600_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ── 2FA ────────────────────────────────────────────────────────────────
  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/setup')
  setup2fa(@Req() req: AuthenticatedRequest) {
    return this.twoFactorService.setup(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/enable')
  enable2fa(@Req() req: AuthenticatedRequest, @Body() dto: Enable2faDto) {
    return this.twoFactorService.enable(req.user.id, dto.code);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/disable')
  disable2fa(@Req() req: AuthenticatedRequest, @Body() dto: Disable2faDto) {
    return this.twoFactorService.disable(req.user.id, dto.code);
  }

  /** P191/5 — 10/dk per IP, 2FA brute-force koruma */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('2fa/login-verify')
  loginVerify2fa(@Body() dto: LoginVerify2faDto) {
    return this.authService.loginVerify2fa(dto.tempToken, dto.code);
  }

  /** Şifre sıfırlama isteği — generic response (privacy)
   *  P191/5 — 3/dk per IP, e-posta spam koruma */
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  /** Şifre sıfırlama */
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  /** Email doğrulama isteği */
  @UseGuards(AuthGuard('jwt'))
  @Post('verify-email/request')
  requestEmailVerification(@Req() req: AuthenticatedRequest) {
    return this.authService.requestEmailVerification(req.user.id);
  }

  /** Email doğrulama onayı */
  @Post('verify-email/confirm')
  confirmEmailVerification(@Body() dto: VerifyEmailDto) {
    return this.authService.confirmEmailVerification(dto.token);
  }

  /** Phase 123 — SMS OTP iste — Phase 170: 10 req/dk (sms cost koruma) */
  @Throttle({ 'auth-login': { limit: 10, ttl: 60_000 } })
  @Post('sms/request')
  requestSmsOtp(@Body() dto: RequestSmsOtpDto) {
    return this.authService.requestSmsOtp(dto.phoneNumber);
  }

  /**
   * Phase 123 — SMS OTP doğrula
   * Phase 230 — Throttle: 5 attempts / 15dk per IP (OTP brute-force koruması).
   * Industry standard (AWS Cognito, Auth0). DB-level: 5 attempts/OTP cap +
   * 5dk expiry + used flag zaten var (sms-otp.entity attempts/expiresAt/used).
   * HTTP throttle ek katman: bir saldırgan farklı phoneNumber'lar üzerinden
   * rate-bypass yapamasın.
   * `auth-login` bucket'ı route-level override ediliyor (Phase 229A neutered
   * slot — yeni bucket eklemek gereksiz; limit/ttl decorator'da ezilir).
   */
  @Throttle({ 'auth-login': { limit: 5, ttl: 15 * 60_000 } })
  @Post('sms/verify')
  verifySmsOtp(
    @Body() dto: VerifySmsOtpDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.authService.verifySmsOtp(
      dto.phoneNumber,
      dto.code,
      this.resolveIp(req),
    );
  }

  /**
   * Phase 231 — Resolve client IP using the same pattern as UserOrIpThrottlerGuard:
   * X-Forwarded-For first (split on comma, trim), fall back to req.ip, then 'unknown'.
   * Used for DB-level per-IP OTP lockout.
   */
  private resolveIp(req: AuthenticatedRequest): string {
    const headers = (req?.headers ?? {}) as Record<string, string | string[] | undefined>;
    const xff = headers['x-forwarded-for'];
    const xffStr = Array.isArray(xff) ? xff[0] : xff;
    const fromXff = xffStr?.split(',')[0]?.trim();
    if (fromXff) return fromXff;
    const ip = (req as unknown as { ip?: string }).ip;
    return typeof ip === 'string' && ip.length > 0 ? ip : 'unknown';
  }
}
