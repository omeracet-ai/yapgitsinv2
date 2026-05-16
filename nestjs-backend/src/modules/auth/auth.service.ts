import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '../users/user.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthUser } from '../../common/types/auth.types';
import { asUserId } from '../../common/branded.types';
import { TwoFactorService } from './two-factor.service';
import { PasswordResetToken } from './password-reset-token.entity';
import { EmailVerificationToken } from './email-verification-token.entity';
import { EmailService } from '../email/email.service';
import { SmsOtp } from './sms-otp.entity';
import { SmsService } from '../sms/sms.service';
import { MoreThan } from 'typeorm';

// Phase 226 — Firebase Admin SDK type (lazy require below to avoid hard dep
// failure in dev environments without service-account creds).
type FirebaseAdmin = typeof import('firebase-admin');

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  /** Phase 226 — Firebase Admin handle. null while disabled or before init. */
  private firebaseAdmin: FirebaseAdmin | null = null;
  /** Phase 226 — true once initializeApp succeeded for this process. */
  private firebaseReady = false;
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private twoFactorService: TwoFactorService,
    @InjectRepository(PasswordResetToken)
    private resetRepo: Repository<PasswordResetToken>,
    @InjectRepository(EmailVerificationToken)
    private emailVerifyRepo: Repository<EmailVerificationToken>,
    private emailService: EmailService,
    @InjectRepository(SmsOtp)
    private smsOtpRepo: Repository<SmsOtp>,
    private smsService: SmsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /** Phase P191/4 — cache key for a user's current tokenVersion (60s TTL). */
  static tokenVerCacheKey(userId: string): string {
    return `user:tokenVer:${userId}`;
  }

  /**
   * Phase P191/4 (Voldi-sec) — Bump tokenVersion for a user.
   * Invalidates ALL outstanding access + refresh tokens. Cache busted so the
   * next protected request re-reads from DB and observes the new version.
   */
  async bumpTokenVersion(userId: string): Promise<void> {
    await this.usersService.incrementTokenVersion(asUserId(userId));
    await this.cacheManager.del(AuthService.tokenVerCacheKey(userId));
  }

  // ── Phase 123 — SMS OTP ────────────────────────────────────────────────
  private normalizeTrPhone(phoneNumber: string): string {
    if (!phoneNumber) throw new BadRequestException('Telefon numarası gerekli');
    const trimmed = phoneNumber.trim().replace(/\s|-/g, '');
    if (!/^(\+90|0)?5\d{9}$/.test(trimmed)) {
      throw new BadRequestException('Geçersiz TR telefon numarası (5XXXXXXXXX)');
    }
    let digits = trimmed.replace(/\D/g, '');
    if (digits.startsWith('90')) digits = digits.slice(2);
    if (digits.startsWith('0')) digits = digits.slice(1);
    return digits; // 5XXXXXXXXX (10 haneli)
  }

  async requestSmsOtp(phoneNumber: string) {
    const phone = this.normalizeTrPhone(phoneNumber);

    // Rate limit: son 1 saatte 3 istek
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.smsOtpRepo.count({
      where: { phoneNumber: phone, createdAt: MoreThan(oneHourAgo) },
    });
    if (recentCount >= 3) {
      throw new BadRequestException('Çok fazla istek. Lütfen daha sonra deneyin.');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.smsOtpRepo.save(
      this.smsOtpRepo.create({ phoneNumber: phone, code, expiresAt }),
    );

    await this.smsService.sendSms(
      phone,
      `Yapgitsin doğrulama kodun: ${code} (5dk geçerli)`,
    );

    return { success: true, expiresInSec: 300 };
  }

  async verifySmsOtp(phoneNumber: string, code: string) {
    const phone = this.normalizeTrPhone(phoneNumber);
    if (!code || !/^\d{6}$/.test(code)) {
      throw new BadRequestException('Geçersiz kod formatı');
    }

    const otp = await this.smsOtpRepo.findOne({
      where: { phoneNumber: phone },
      order: { createdAt: 'DESC' },
    });
    if (!otp) throw new BadRequestException('Kod bulunamadı');
    if (otp.used) throw new BadRequestException('Kod zaten kullanıldı');
    if (otp.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Kod süresi doldu');
    }
    if (otp.attempts >= 5) {
      throw new BadRequestException('Çok fazla deneme');
    }
    if (otp.code !== code) {
      otp.attempts += 1;
      await this.smsOtpRepo.save(otp);
      throw new BadRequestException('Yanlış kod');
    }

    otp.used = true;
    await this.smsOtpRepo.save(otp);

    const existing = await this.usersService.findByPhone(phone);
    if (existing) {
      const { passwordHash: _ph, ...safe } = existing;
      const access_token = this.signAccessToken(safe as AuthUser);
      const refresh_token = this.signRefreshToken({
        id: safe.id,
        tenantId: safe.tenantId ?? null,
        tokenVersion: existing.tokenVersion ?? 0,
      });
      return {
        access_token,
        refresh_token,
        user: safe,
        isNewUser: false,
      };
    }

    return {
      access_token: null,
      user: null,
      isNewUser: true,
      phoneVerified: true,
      phoneNumber: phone,
      message: 'İlk girişte ek bilgi gerekli',
    };
  }
  // ── /Phase 123 ─────────────────────────────────────────────────────────

  async requestEmailVerification(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new BadRequestException('Kullanıcı bulunamadı');
    if (user.emailVerified) {
      throw new BadRequestException('Email zaten doğrulanmış');
    }
    const plain = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(plain);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.emailVerifyRepo.save(
      this.emailVerifyRepo.create({ userId: user.id, tokenHash, expiresAt, usedAt: null }),
    );
    const base = process.env.FRONTEND_URL ?? 'https://yapgitsin.tr';
    const verifyUrl = `${base}/verify-email?token=${plain}`;
    return {
      success: true,
      verifyUrl,
      message: 'Doğrulama bağlantısı gönderildi',
    };
  }

  async confirmEmailVerification(token: string) {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Geçersiz veya süresi dolmuş kod');
    }
    const tokenHash = this.hashToken(token);
    const record = await this.emailVerifyRepo.findOne({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Geçersiz veya süresi dolmuş kod');
    }
    await this.usersService.update(record.userId, { emailVerified: true });
    const now = new Date();
    record.usedAt = now;
    await this.emailVerifyRepo.save(record);
    await this.emailVerifyRepo
      .createQueryBuilder()
      .update(EmailVerificationToken)
      .set({ usedAt: now })
      .where('userId = :uid AND usedAt IS NULL', { uid: record.userId })
      .execute();
    return { success: true, emailVerified: true };
  }

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
    // Phase 121 — fire-and-forget password reset email
    void this.emailService.sendPasswordReset(user, plain);
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

  // ── Phase 226 — Firebase Admin lazy init (shared with FcmService env) ────
  private initFirebaseAdmin(): void {
    if (this.firebaseReady) return;
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) {
      this.logger.log(
        'Firebase bridge disabled (FIREBASE_SERVICE_ACCOUNT_JSON not set)',
      );
      return;
    }
    try {
      let jsonStr = raw.trim();
      if (!jsonStr.startsWith('{')) {
        jsonStr = Buffer.from(jsonStr, 'base64').toString('utf8');
      }
      const credentials = JSON.parse(jsonStr) as Record<string, unknown>;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const admin = require('firebase-admin') as FirebaseAdmin;
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(
            credentials as unknown as import('firebase-admin').ServiceAccount,
          ),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      }
      this.firebaseAdmin = admin;
      this.firebaseReady = true;
      this.logger.log('Firebase Admin initialized (auth bridge ready)');
    } catch (err) {
      this.logger.warn(
        `Firebase Admin init failed — /auth/firebase will 503: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Phase 226 — Verify a Firebase ID token and issue backend JWTs.
   *
   * Flow:
   *  1. Verify token via firebase-admin (signature, expiry, audience).
   *  2. Look up the user: first by firebaseUid, then fall back to email
   *     (for email/password users adopting social sign-in for the same
   *     address — we link by writing firebaseUid onto the existing row).
   *  3. If no match, create a new user with a placeholder phoneNumber
   *     (firebase: prefix, unique by uid) — user can add real phone later.
   *  4. Issue access + refresh tokens matching /auth/login response shape.
   *
   * Errors map to UnauthorizedException (401) with a stable, non-leaky
   * Turkish message; the original cause is logged server-side.
   */
  async loginWithFirebase(idToken: string) {
    if (!idToken || typeof idToken !== 'string') {
      throw new UnauthorizedException('Firebase ID token gerekli');
    }
    if (!this.firebaseReady) {
      // Try once more — env may have been set after boot in some hosts.
      this.initFirebaseAdmin();
    }
    if (!this.firebaseReady || !this.firebaseAdmin) {
      throw new UnauthorizedException('Sosyal giriş geçici olarak kullanılamıyor');
    }

    let decoded: import('firebase-admin').auth.DecodedIdToken;
    try {
      decoded = await this.firebaseAdmin.auth().verifyIdToken(idToken, true);
    } catch (err) {
      this.logger.warn(`Firebase token verify failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Firebase token geçersiz');
    }

    const fbUid = decoded.uid;
    const fbEmail = (decoded.email || '').toLowerCase() || null;
    const fbName =
      (decoded.name as string | undefined) ||
      (fbEmail ? fbEmail.split('@')[0] : 'Kullanıcı');
    const emailVerifiedFromToken = decoded.email_verified === true;

    // 1) uid match
    let user = await this.usersService.findByFirebaseUid(fbUid);

    // 2) link by email if email/password user existed first
    if (!user && fbEmail) {
      const byEmail = await this.usersService.findByEmail(fbEmail);
      if (byEmail) {
        await this.usersService.update(byEmail.id, {
          firebaseUid: fbUid,
          // Promote emailVerified if Firebase confirmed it.
          emailVerified: byEmail.emailVerified || emailVerifiedFromToken,
        });
        user = await this.usersService.findById(byEmail.id);
      }
    }

    // 3) create
    if (!user) {
      // Placeholder phone — phoneNumber is unique + NOT NULL, so synthesize
      // a deterministic non-collidable value tied to the Firebase uid.
      // User can replace it via PATCH /users/me later. The `firebase:` prefix
      // is filtered out of SMS / display logic by length+format checks.
      const placeholderPhone = `firebase:${fbUid}`.slice(0, 20);
      user = await this.usersService.create({
        fullName: fbName,
        email: fbEmail ?? undefined,
        phoneNumber: placeholderPhone,
        passwordHash: null as unknown as string, // social-only user, no password
        firebaseUid: fbUid,
        emailVerified: emailVerifiedFromToken,
        role: UserRole.USER,
        isPhoneVerified: false,
      });
    }

    if (user.suspended) throw new ForbiddenException('Hesap askıda');
    if (user.deactivated) throw new ForbiddenException('Hesap silindi');

    const { passwordHash: _ph, ...safe } = user;
    const access_token = this.signAccessToken(safe as AuthUser);
    const refresh_token = this.signRefreshToken({
      id: safe.id,
      tenantId: safe.tenantId ?? null,
      tokenVersion: user.tokenVersion ?? 0,
    });
    return {
      access_token,
      refresh_token,
      user: safe,
      provider: decoded.firebase?.sign_in_provider ?? 'firebase',
    };
  }

  async onModuleInit() {
    // Phase 226 — Firebase Admin bridge (best-effort; disabled w/o creds)
    this.initFirebaseAdmin();

    const adminEmail = 'admin@yapgitsin.tr';
    const legacyEmail = 'admin@hizmet.app';
    const existing = await this.usersService.findByEmail(adminEmail);
    if (existing) {
      return;
    }
    const legacy = await this.usersService.findByEmail(legacyEmail);
    if (legacy) {
      await this.usersService.update(legacy.id, { email: adminEmail });
      this.logger.log('Admin email migrated: hizmet.app → yapgitsin.tr');
      return;
    }
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
    this.logger.log('Admin seeded');
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
      // Phase 47 — askıya alınmış kullanıcı login yapamaz
      if (user.suspended) {
        throw new ForbiddenException('Hesap askıda');
      }
      // Phase 60 — silinmiş hesap login yapamaz
      if (user.deactivated) {
        throw new ForbiddenException('Hesap silindi');
      }
      const { passwordHash: _hash, ...result } = user;
      return result;
    }
    return null;
  }

  // ── Phase P188/4 — Refresh token rotation (Voldi-sec) ────────────────────
  /** Refresh-token secret: dedicated env var, falls back to JWT_SECRET in dev. */
  private getRefreshSecret(): string {
    return (
      process.env.JWT_REFRESH_SECRET ||
      process.env.JWT_SECRET ||
      ''
    );
  }

  /** Sign a refresh token (separate secret + longer expiry + tokenVersion claim). */
  private signRefreshToken(user: {
    id: string;
    tenantId?: string | null;
    tokenVersion?: number;
  }): string {
    return this.jwtService.sign(
      {
        sub: user.id,
        tenantId: user.tenantId ?? null,
        tv: user.tokenVersion ?? 0,
        typ: 'refresh',
      },
      { secret: this.getRefreshSecret(), expiresIn: '365d' },
    );
  }

  /** Sign an access token (existing 30d expiry, default JWT_SECRET). */
  private signAccessToken(
    user: AuthUser & { tokenVersion?: number },
  ): string {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      tenantId: user.tenantId ?? null,
      // Phase P191/4 — included so JwtStrategy can compare against User.tokenVersion.
      // Legacy tokens (no claim) default to 0 downstream.
      tokenVersion: user.tokenVersion ?? 0,
    };
    return this.jwtService.sign(payload, { expiresIn: '365d' });
  }

  /**
   * Verify a refresh token, rotate tokenVersion, issue a new pair.
   * Throws UnauthorizedException on any failure (expired, bad sig, banned user,
   * version mismatch — meaning the refresh token was already used or revoked).
   */
  async refresh(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new UnauthorizedException('Refresh token gerekli');
    }
    let payload: { sub: string; tv?: number; typ?: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.getRefreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Geçersiz refresh token');
    }
    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Token tipi hatalı');
    }
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Kullanıcı bulunamadı');
    if (user.suspended) throw new UnauthorizedException('Hesap askıda');
    if (user.deactivated) throw new UnauthorizedException('Hesap silindi');

    const currentVersion = user.tokenVersion ?? 0;
    const tokenVersion = payload.tv ?? 0;
    if (tokenVersion !== currentVersion) {
      // Reused / revoked refresh token.
      throw new UnauthorizedException('Refresh token geçersiz (rotated)');
    }

    // Rotate: bump version (invalidates this refresh token going forward).
    const nextVersion = currentVersion + 1;
    await this.usersService.update(user.id, { tokenVersion: nextVersion });

    const { passwordHash: _ph, ...safe } = user;
    // Phase P191/4 — stamp the new access token with the bumped tokenVersion
    // (the in-memory `safe` snapshot still has the OLD value).
    const accessToken = this.signAccessToken({
      ...(safe as AuthUser),
      tokenVersion: nextVersion,
    });
    const newRefreshToken = this.signRefreshToken({
      id: user.id,
      tenantId: user.tenantId ?? null,
      tokenVersion: nextVersion,
    });
    // Bust tokenVersion cache so JwtStrategy sees the new value immediately.
    await this.cacheManager.del(AuthService.tokenVerCacheKey(user.id));
    return { accessToken, refreshToken: newRefreshToken };
  }

  login(user: AuthUser) {
    if ((user as AuthUser & { twoFactorEnabled?: boolean }).twoFactorEnabled) {
      const tempToken = this.jwtService.sign(
        { sub: user.id, purpose: 'twofa' },
        { expiresIn: '5m' },
      );
      return { requires2FA: true, tempToken };
    }
    const access_token = this.signAccessToken(user);
    const refresh_token = this.signRefreshToken({
      id: user.id,
      tenantId: user.tenantId ?? null,
      tokenVersion:
        (user as AuthUser & { tokenVersion?: number }).tokenVersion ?? 0,
    });
    return {
      access_token,
      refresh_token,
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
    if (user.suspended) throw new ForbiddenException('Hesap askıda');
    const { passwordHash: _h, ...result } = user;
    const access_token = this.signAccessToken(result as AuthUser);
    const refresh_token = this.signRefreshToken({
      id: result.id,
      tenantId: result.tenantId ?? null,
      tokenVersion: (result as User).tokenVersion ?? 0,
    });
    return {
      access_token,
      refresh_token,
      user: result,
    };
  }

  async adminLogin(username: string, password: string) {
    const email = username === 'admin' ? 'admin@yapgitsin.tr' : username;
    const user = await this.usersService.findByEmail(email);
    if (!user || user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Geçersiz admin bilgileri');
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Geçersiz admin bilgileri');
    }
    if (user.suspended) {
      throw new ForbiddenException('Hesap askıda');
    }
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      tenantId: user.tenantId ?? null,
      // Phase P191/4 — token revocation for admin sessions too.
      tokenVersion: user.tokenVersion ?? 0,
    };
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '365d' }),
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
    // Phase 121 — fire-and-forget welcome email
    void this.emailService.sendWelcome(newUser);
    const access_token = this.signAccessToken(result as AuthUser);
    const refresh_token = this.signRefreshToken({
      id: result.id,
      tenantId: result.tenantId ?? null,
      tokenVersion: (newUser as User).tokenVersion ?? 0,
    });
    return {
      access_token,
      refresh_token,
      user: result,
    };
  }
}
