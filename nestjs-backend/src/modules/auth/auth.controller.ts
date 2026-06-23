import {
  Controller,
  Get,
  Post,
  Body,
  Header,
  HttpCode,
  Query,
  UnauthorizedException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
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
import { LoginThrottleGuard } from '../../common/guards/login-throttle.guard';
import { RegisterThrottleGuard } from '../../common/guards/register-throttle.guard';
import type { Request } from 'express';

/** Phase 255b — extract first XFF / remote address for account-lock attribution. */
function extractIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0)
    return xff.split(',')[0].trim();
  if (Array.isArray(xff) && xff.length > 0) return xff[0];
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private twoFactorService: TwoFactorService,
  ) {}

  /** Kullanıcı / işçi girişi — Phase 170: 20 req/dk per IP (brute-force koruma) */
  @Throttle({ 'auth-login': { limit: 20, ttl: 60_000 } })
  @UseGuards(LoginThrottleGuard)
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = extractIp(req);
    const user = await this.authService.validateUser(
      dto.email,
      dto.password,
      ip,
    );
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
  @UseGuards(LoginThrottleGuard)
  @Post('admin/login')
  adminLogin(@Body() dto: AdminLoginDto, @Req() req: Request) {
    return this.authService.adminLogin(
      dto.username,
      dto.password,
      extractIp(req),
    );
  }

  /**
   * Yeni kullanıcı / işçi kaydı.
   * Phase 523 — `RegisterThrottleGuard` kullanılıyor: 3 BAŞARILI kayıt / saat
   * per IP. 400 validation hataları sayılmaz (E2E agent IP'sini kilitlemiyor).
   * Standart `Retry-After` header döner. Global `auth-register` slot'u skip
   * edilir; gerçek limiti guard koyar.
   */
  @SkipThrottle({ 'auth-register': true })
  @UseGuards(RegisterThrottleGuard)
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    // Phase 256 (Voldi-fs) — pass IP + User-Agent for the KVKK consent audit
    // trail (same plumbing pattern as adminLogin).
    const userAgent = req.headers['user-agent'];
    return this.authService.register(dto, {
      ipAddress: extractIp(req),
      userAgent: typeof userAgent === 'string' ? userAgent : null,
    });
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

  /** GET reset-password — HTML form page (browser-rendered, served by backend
   *  because the marketing/Next.js domain has no route for this path). */
  @Get('reset-password')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  resetPasswordPage(): string {
    return RESET_PASSWORD_HTML;
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

  /** GET verify-email — maildeki bağlantı; token'ı tek tıkla onaylar, sonucu HTML gösterir. */
  @Get('verify-email')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async verifyEmailPage(@Query('token') token?: string): Promise<string> {
    try {
      await this.authService.confirmEmailVerification(token ?? '');
      return VERIFY_EMAIL_OK_HTML;
    } catch {
      return VERIFY_EMAIL_FAIL_HTML;
    }
  }

  /** Phase 123 — SMS OTP iste — Phase 170: 10 req/dk (sms cost koruma) */
  @Throttle({ 'auth-login': { limit: 10, ttl: 60_000 } })
  @UseGuards(LoginThrottleGuard)
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
  @UseGuards(LoginThrottleGuard)
  @Post('sms/verify')
  verifySmsOtp(@Body() dto: VerifySmsOtpDto, @Req() req: AuthenticatedRequest) {
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
    const headers = (req?.headers ?? {}) as Record<
      string,
      string | string[] | undefined
    >;
    const xff = headers['x-forwarded-for'];
    const xffStr = Array.isArray(xff) ? xff[0] : xff;
    const fromXff = xffStr?.split(',')[0]?.trim();
    if (fromXff) return fromXff;
    const ip = (req as unknown as { ip?: string }).ip;
    return typeof ip === 'string' && ip.length > 0 ? ip : 'unknown';
  }
}

/** Verify-email result pages served by GET /auth/verify-email.
 *  Self-contained (no external assets); no untrusted values rendered. */
const VERIFY_EMAIL_OK_HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>E-posta Dogrulandi - Yapgitsin</title>
<style>
* { box-sizing: border-box; }
body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #0C1117 0%, #161B22 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; color: #fff; }
.card { background: #161B22; border: 1px solid #2a3441; border-radius: 16px; padding: 40px 32px; width: 100%; max-width: 420px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); text-align: center; }
.logo { font-size: 28px; font-weight: 800; color: #4ADE80; margin-bottom: 24px; }
.icon { font-size: 56px; margin-bottom: 16px; }
h1 { margin: 0 0 12px; font-size: 22px; color: #4ADE80; }
p { color: #8b949e; font-size: 15px; margin: 0; }
</style>
</head>
<body>
<div class="card">
<div class="logo">Yapgitsin</div>
<div class="icon">&#9989;</div>
<h1>E-posta adresin dogrulandi</h1>
<p>Uygulamaya donebilirsin.</p>
</div>
</body>
</html>`;

/** Verify-email failure page served by GET /auth/verify-email on invalid/expired token. */
const VERIFY_EMAIL_FAIL_HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Dogrulama Basarisiz - Yapgitsin</title>
<style>
* { box-sizing: border-box; }
body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #0C1117 0%, #161B22 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; color: #fff; }
.card { background: #161B22; border: 1px solid #2a3441; border-radius: 16px; padding: 40px 32px; width: 100%; max-width: 420px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); text-align: center; }
.logo { font-size: 28px; font-weight: 800; color: #4ADE80; margin-bottom: 24px; }
.icon { font-size: 56px; margin-bottom: 16px; }
h1 { margin: 0 0 12px; font-size: 22px; color: #f85149; }
p { color: #8b949e; font-size: 15px; margin: 0; }
</style>
</head>
<body>
<div class="card">
<div class="logo">Yapgitsin</div>
<div class="icon">&#10060;</div>
<h1>Baglanti gecersiz veya suresi dolmus</h1>
<p>Uygulamadan yeni bir dogrulama baglantisi iste.</p>
</div>
</body>
</html>`;

/** Reset-password HTML page served by GET /auth/reset-password.
 *  Self-contained (no external assets); form POSTs to /auth/reset-password.
 *  All untrusted values rendered with textContent only — no innerHTML. */
const RESET_PASSWORD_HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Sifre Sifirla - Yapgitsin</title>
<style>
* { box-sizing: border-box; }
body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #0C1117 0%, #161B22 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; color: #fff; }
.card { background: #161B22; border: 1px solid #2a3441; border-radius: 16px; padding: 32px; width: 100%; max-width: 420px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
h1 { margin: 0 0 8px; font-size: 24px; }
.sub { color: #8b949e; margin-bottom: 24px; font-size: 14px; }
label { display: block; font-size: 13px; margin-bottom: 6px; color: #c9d1d9; }
input[type=password] { width: 100%; padding: 12px 14px; margin-bottom: 16px; background: #0d1117; border: 1px solid #30363d; border-radius: 8px; color: #fff; font-size: 15px; }
input:focus { outline: none; border-color: #4ADE80; }
button { width: 100%; padding: 14px; background: #4ADE80; color: #000; border: none; border-radius: 8px; font-size: 16px; font-weight: 700; cursor: pointer; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
button:hover:not(:disabled) { background: #3bbf6a; }
.msg { padding: 12px; border-radius: 8px; margin-top: 16px; font-size: 14px; }
.msg-error { background: rgba(248, 81, 73, 0.15); border: 1px solid #f85149; color: #ffa198; }
.msg-success { background: rgba(74, 222, 128, 0.15); border: 1px solid #4ADE80; color: #4ADE80; }
.logo { font-size: 28px; font-weight: 800; color: #4ADE80; margin-bottom: 24px; text-align: center; }
.rules { font-size: 12px; color: #8b949e; margin-top: -8px; margin-bottom: 16px; }
a { color: #4ADE80; text-decoration: none; }
</style>
</head>
<body>
<div class="card">
<div class="logo">Yapgitsin</div>
<h1>Yeni Sifre Belirle</h1>
<div class="sub">Lutfen guclu bir sifre secin.</div>
<form id="form">
<label for="pw">Yeni Sifre</label>
<input id="pw" type="password" required minlength="8" autocomplete="new-password" />
<div class="rules">En az 8 karakter, en az 1 buyuk harf ve 1 rakam.</div>
<label for="pw2">Sifre (Tekrar)</label>
<input id="pw2" type="password" required minlength="8" autocomplete="new-password" />
<button id="submit" type="submit">Sifreyi Guncelle</button>
</form>
<div id="msg"></div>
<div id="success-extra" style="display:none; margin-top: 8px;"><a href="https://yapgitsin.tr/">Yapgitsin uygulamasina giris yap</a></div>
</div>
<script>
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const form = document.getElementById('form');
const msg = document.getElementById('msg');
const btn = document.getElementById('submit');
const successExtra = document.getElementById('success-extra');
if (!token) { msg.className = 'msg msg-error'; msg.textContent = 'Gecersiz veya eksik token.'; form.style.display = 'none'; }
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = document.getElementById('pw').value;
  const pw2 = document.getElementById('pw2').value;
  msg.className = ''; msg.textContent = '';
  if (pw !== pw2) { msg.className = 'msg msg-error'; msg.textContent = 'Sifreler eslesmiyor.'; return; }
  if (!/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) { msg.className = 'msg msg-error'; msg.textContent = 'Sifre en az 1 buyuk harf ve 1 rakam icermeli.'; return; }
  btn.disabled = true; btn.textContent = 'Guncelleniyor...';
  try {
    const res = await fetch('/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, newPassword: pw }) });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.success) { msg.className = 'msg msg-success'; msg.textContent = 'Sifreniz guncellendi.'; successExtra.style.display = 'block'; form.style.display = 'none'; }
    else { msg.className = 'msg msg-error'; msg.textContent = body.message || 'Sifre guncellenemedi. Token suresi dolmus veya kullanilmis olabilir.'; btn.disabled = false; btn.textContent = 'Sifreyi Guncelle'; }
  } catch (err) { msg.className = 'msg msg-error'; msg.textContent = 'Baglanti hatasi: ' + err.message; btn.disabled = false; btn.textContent = 'Sifreyi Guncelle'; }
});
</script>
</body>
</html>`;
