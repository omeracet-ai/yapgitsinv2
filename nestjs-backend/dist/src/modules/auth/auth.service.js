"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const users_service_1 = require("../users/users.service");
const jwt_1 = require("@nestjs/jwt");
const user_entity_1 = require("../users/user.entity");
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const branded_1 = require("../../common/types/branded");
const two_factor_service_1 = require("./two-factor.service");
const password_reset_token_entity_1 = require("./password-reset-token.entity");
const email_verification_token_entity_1 = require("./email-verification-token.entity");
const email_service_1 = require("../email/email.service");
const sms_otp_entity_1 = require("./sms-otp.entity");
const sms_service_1 = require("../sms/sms.service");
const typeorm_3 = require("typeorm");
let AuthService = AuthService_1 = class AuthService {
    usersService;
    jwtService;
    twoFactorService;
    resetRepo;
    emailVerifyRepo;
    emailService;
    smsOtpRepo;
    smsService;
    cacheManager;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(usersService, jwtService, twoFactorService, resetRepo, emailVerifyRepo, emailService, smsOtpRepo, smsService, cacheManager) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.twoFactorService = twoFactorService;
        this.resetRepo = resetRepo;
        this.emailVerifyRepo = emailVerifyRepo;
        this.emailService = emailService;
        this.smsOtpRepo = smsOtpRepo;
        this.smsService = smsService;
        this.cacheManager = cacheManager;
    }
    static tokenVerCacheKey(userId) {
        return `user:tokenVer:${userId}`;
    }
    async bumpTokenVersion(userId) {
        await this.usersService.incrementTokenVersion((0, branded_1.asUserId)(userId));
        await this.cacheManager.del(AuthService_1.tokenVerCacheKey(userId));
    }
    normalizeTrPhone(phoneNumber) {
        if (!phoneNumber)
            throw new common_1.BadRequestException('Telefon numarası gerekli');
        const trimmed = phoneNumber.trim().replace(/\s|-/g, '');
        if (!/^(\+90|0)?5\d{9}$/.test(trimmed)) {
            throw new common_1.BadRequestException('Geçersiz TR telefon numarası (5XXXXXXXXX)');
        }
        let digits = trimmed.replace(/\D/g, '');
        if (digits.startsWith('90'))
            digits = digits.slice(2);
        if (digits.startsWith('0'))
            digits = digits.slice(1);
        return digits;
    }
    async requestSmsOtp(phoneNumber) {
        const phone = this.normalizeTrPhone(phoneNumber);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentCount = await this.smsOtpRepo.count({
            where: { phoneNumber: phone, createdAt: (0, typeorm_3.MoreThan)(oneHourAgo) },
        });
        if (recentCount >= 3) {
            throw new common_1.BadRequestException('Çok fazla istek. Lütfen daha sonra deneyin.');
        }
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await this.smsOtpRepo.save(this.smsOtpRepo.create({ phoneNumber: phone, code, expiresAt }));
        await this.smsService.sendSms(phone, `Yapgitsin doğrulama kodun: ${code} (5dk geçerli)`);
        return { success: true, expiresInSec: 300 };
    }
    async verifySmsOtp(phoneNumber, code) {
        const phone = this.normalizeTrPhone(phoneNumber);
        if (!code || !/^\d{6}$/.test(code)) {
            throw new common_1.BadRequestException('Geçersiz kod formatı');
        }
        const otp = await this.smsOtpRepo.findOne({
            where: { phoneNumber: phone },
            order: { createdAt: 'DESC' },
        });
        if (!otp)
            throw new common_1.BadRequestException('Kod bulunamadı');
        if (otp.used)
            throw new common_1.BadRequestException('Kod zaten kullanıldı');
        if (otp.expiresAt.getTime() < Date.now()) {
            throw new common_1.BadRequestException('Kod süresi doldu');
        }
        if (otp.attempts >= 5) {
            throw new common_1.BadRequestException('Çok fazla deneme');
        }
        if (otp.code !== code) {
            otp.attempts += 1;
            await this.smsOtpRepo.save(otp);
            throw new common_1.BadRequestException('Yanlış kod');
        }
        otp.used = true;
        await this.smsOtpRepo.save(otp);
        const existing = await this.usersService.findByPhone(phone);
        if (existing) {
            const { passwordHash: _ph, ...safe } = existing;
            const access_token = this.signAccessToken(safe);
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
    async requestEmailVerification(userId) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.BadRequestException('Kullanıcı bulunamadı');
        if (user.emailVerified) {
            throw new common_1.BadRequestException('Email zaten doğrulanmış');
        }
        const plain = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(plain);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.emailVerifyRepo.save(this.emailVerifyRepo.create({ userId: user.id, tokenHash, expiresAt, usedAt: null }));
        const base = process.env.FRONTEND_URL ?? 'https://yapgitsin.tr';
        const verifyUrl = `${base}/verify-email?token=${plain}`;
        return {
            success: true,
            verifyUrl,
            message: 'Doğrulama bağlantısı gönderildi',
        };
    }
    async confirmEmailVerification(token) {
        if (!token || typeof token !== 'string') {
            throw new common_1.BadRequestException('Geçersiz veya süresi dolmuş kod');
        }
        const tokenHash = this.hashToken(token);
        const record = await this.emailVerifyRepo.findOne({ where: { tokenHash } });
        if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
            throw new common_1.BadRequestException('Geçersiz veya süresi dolmuş kod');
        }
        await this.usersService.update(record.userId, { emailVerified: true });
        const now = new Date();
        record.usedAt = now;
        await this.emailVerifyRepo.save(record);
        await this.emailVerifyRepo
            .createQueryBuilder()
            .update(email_verification_token_entity_1.EmailVerificationToken)
            .set({ usedAt: now })
            .where('userId = :uid AND usedAt IS NULL', { uid: record.userId })
            .execute();
        return { success: true, emailVerified: true };
    }
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    async forgotPassword(email) {
        const generic = {
            success: true,
            message: 'Eğer bu email kayıtlı ise sıfırlama bağlantısı gönderildi',
        };
        if (!email)
            return generic;
        const user = await this.usersService.findByEmail(email);
        if (!user)
            return generic;
        const plain = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(plain);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await this.resetRepo.save(this.resetRepo.create({ userId: user.id, tokenHash, expiresAt, usedAt: null }));
        const base = process.env.FRONTEND_URL ?? 'https://yapgitsin.tr';
        generic.resetUrl = `${base}/reset-password?token=${plain}`;
        void this.emailService.sendPasswordReset(user, plain);
        return generic;
    }
    async resetPassword(token, newPassword) {
        if (!token || typeof token !== 'string') {
            throw new common_1.BadRequestException('Geçersiz veya süresi dolmuş kod');
        }
        if (!newPassword || newPassword.length < 6) {
            throw new common_1.BadRequestException('Şifre en az 6 karakter olmalı');
        }
        const tokenHash = this.hashToken(token);
        const record = await this.resetRepo.findOne({ where: { tokenHash } });
        if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
            throw new common_1.BadRequestException('Geçersiz veya süresi dolmuş kod');
        }
        const passwordHash = await bcrypt.hash(newPassword, await bcrypt.genSalt());
        await this.usersService.update(record.userId, { passwordHash });
        const now = new Date();
        record.usedAt = now;
        await this.resetRepo.save(record);
        await this.resetRepo
            .createQueryBuilder()
            .update(password_reset_token_entity_1.PasswordResetToken)
            .set({ usedAt: now })
            .where('userId = :uid AND usedAt IS NULL', { uid: record.userId })
            .execute();
        return { success: true };
    }
    async onModuleInit() {
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
        const initialPassword = process.env.ADMIN_INITIAL_PASSWORD ?? 'change_me_now';
        const passwordHash = await bcrypt.hash(initialPassword, 10);
        await this.usersService.create({
            fullName: 'Admin',
            email: adminEmail,
            phoneNumber: '05000000000',
            passwordHash,
            role: user_entity_1.UserRole.ADMIN,
            isPhoneVerified: true,
        });
        this.logger.log('Admin seeded');
    }
    async validateUser(emailOrPhone, pass) {
        const user = (await this.usersService.findByEmail(emailOrPhone)) ??
            (await this.usersService.findByPhone(emailOrPhone));
        if (user &&
            user.passwordHash &&
            (await bcrypt.compare(pass, user.passwordHash))) {
            if (user.suspended) {
                throw new common_1.ForbiddenException('Hesap askıda');
            }
            if (user.deactivated) {
                throw new common_1.ForbiddenException('Hesap silindi');
            }
            const { passwordHash: _hash, ...result } = user;
            return result;
        }
        return null;
    }
    getRefreshSecret() {
        return (process.env.JWT_REFRESH_SECRET ||
            process.env.JWT_SECRET ||
            '');
    }
    signRefreshToken(user) {
        return this.jwtService.sign({
            sub: user.id,
            tenantId: user.tenantId ?? null,
            tv: user.tokenVersion ?? 0,
            typ: 'refresh',
        }, { secret: this.getRefreshSecret(), expiresIn: '365d' });
    }
    signAccessToken(user) {
        const payload = {
            email: user.email,
            sub: user.id,
            role: user.role,
            tenantId: user.tenantId ?? null,
            tokenVersion: user.tokenVersion ?? 0,
        };
        return this.jwtService.sign(payload, { expiresIn: '365d' });
    }
    async refresh(refreshToken) {
        if (!refreshToken || typeof refreshToken !== 'string') {
            throw new common_1.UnauthorizedException('Refresh token gerekli');
        }
        let payload;
        try {
            payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.getRefreshSecret(),
            });
        }
        catch {
            throw new common_1.UnauthorizedException('Geçersiz refresh token');
        }
        if (payload.typ !== 'refresh') {
            throw new common_1.UnauthorizedException('Token tipi hatalı');
        }
        const user = await this.usersService.findById(payload.sub);
        if (!user)
            throw new common_1.UnauthorizedException('Kullanıcı bulunamadı');
        if (user.suspended)
            throw new common_1.UnauthorizedException('Hesap askıda');
        if (user.deactivated)
            throw new common_1.UnauthorizedException('Hesap silindi');
        const currentVersion = user.tokenVersion ?? 0;
        const tokenVersion = payload.tv ?? 0;
        if (tokenVersion !== currentVersion) {
            throw new common_1.UnauthorizedException('Refresh token geçersiz (rotated)');
        }
        const nextVersion = currentVersion + 1;
        await this.usersService.update(user.id, { tokenVersion: nextVersion });
        const { passwordHash: _ph, ...safe } = user;
        const accessToken = this.signAccessToken({
            ...safe,
            tokenVersion: nextVersion,
        });
        const newRefreshToken = this.signRefreshToken({
            id: user.id,
            tenantId: user.tenantId ?? null,
            tokenVersion: nextVersion,
        });
        await this.cacheManager.del(AuthService_1.tokenVerCacheKey(user.id));
        return { accessToken, refreshToken: newRefreshToken };
    }
    login(user) {
        if (user.twoFactorEnabled) {
            const tempToken = this.jwtService.sign({ sub: user.id, purpose: 'twofa' }, { expiresIn: '5m' });
            return { requires2FA: true, tempToken };
        }
        const access_token = this.signAccessToken(user);
        const refresh_token = this.signRefreshToken({
            id: user.id,
            tenantId: user.tenantId ?? null,
            tokenVersion: user.tokenVersion ?? 0,
        });
        return {
            access_token,
            refresh_token,
            user,
        };
    }
    async loginVerify2fa(tempToken, code) {
        let payload;
        try {
            payload = this.jwtService.verify(tempToken);
        }
        catch {
            throw new common_1.UnauthorizedException('Geçersiz veya süresi dolmuş token');
        }
        if (payload.purpose !== 'twofa') {
            throw new common_1.UnauthorizedException('Geçersiz token amacı');
        }
        const ok = await this.twoFactorService.verify(payload.sub, code);
        if (!ok)
            throw new common_1.UnauthorizedException('Kod yanlış');
        const user = await this.usersService.findById(payload.sub);
        if (!user)
            throw new common_1.UnauthorizedException('Kullanıcı bulunamadı');
        if (user.suspended)
            throw new common_1.ForbiddenException('Hesap askıda');
        const { passwordHash: _h, ...result } = user;
        const access_token = this.signAccessToken(result);
        const refresh_token = this.signRefreshToken({
            id: result.id,
            tenantId: result.tenantId ?? null,
            tokenVersion: result.tokenVersion ?? 0,
        });
        return {
            access_token,
            refresh_token,
            user: result,
        };
    }
    async adminLogin(username, password) {
        const email = username === 'admin' ? 'admin@yapgitsin.tr' : username;
        const user = await this.usersService.findByEmail(email);
        if (!user || user.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.UnauthorizedException('Geçersiz admin bilgileri');
        }
        if (!(await bcrypt.compare(password, user.passwordHash))) {
            throw new common_1.UnauthorizedException('Geçersiz admin bilgileri');
        }
        if (user.suspended) {
            throw new common_1.ForbiddenException('Hesap askıda');
        }
        const payload = {
            email: user.email,
            sub: user.id,
            role: user.role,
            tenantId: user.tenantId ?? null,
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
    async register(userData) {
        const existingByEmail = userData.email
            ? await this.usersService.findByEmail(userData.email)
            : null;
        if (existingByEmail)
            throw new common_1.UnauthorizedException('Bu e-posta zaten kayıtlı');
        const existingByPhone = await this.usersService.findByPhone(userData.phoneNumber);
        if (existingByPhone)
            throw new common_1.UnauthorizedException('Bu telefon numarası zaten kayıtlı');
        const passwordHash = await bcrypt.hash(userData.password, await bcrypt.genSalt());
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
            role: user_entity_1.UserRole.USER,
            isPhoneVerified: true,
        });
        const { passwordHash: _hash2, ...result } = newUser;
        void this.emailService.sendWelcome(newUser);
        const access_token = this.signAccessToken(result);
        const refresh_token = this.signRefreshToken({
            id: result.id,
            tenantId: result.tenantId ?? null,
            tokenVersion: newUser.tokenVersion ?? 0,
        });
        return {
            access_token,
            refresh_token,
            user: result,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_2.InjectRepository)(password_reset_token_entity_1.PasswordResetToken)),
    __param(4, (0, typeorm_2.InjectRepository)(email_verification_token_entity_1.EmailVerificationToken)),
    __param(6, (0, typeorm_2.InjectRepository)(sms_otp_entity_1.SmsOtp)),
    __param(8, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        two_factor_service_1.TwoFactorService,
        typeorm_1.Repository,
        typeorm_1.Repository,
        email_service_1.EmailService,
        typeorm_1.Repository,
        sms_service_1.SmsService, Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map