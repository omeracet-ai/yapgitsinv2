"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const throttler_1 = require("@nestjs/throttler");
const auth_service_1 = require("./auth.service");
const two_factor_service_1 = require("./two-factor.service");
let AuthController = class AuthController {
    authService;
    twoFactorService;
    constructor(authService, twoFactorService) {
        this.authService = authService;
        this.twoFactorService = twoFactorService;
    }
    async login(body) {
        const user = await this.authService.validateUser(body.email, body.password);
        if (!user)
            throw new common_1.UnauthorizedException('E-posta veya şifre hatalı');
        return this.authService.login(user);
    }
    async refresh(body) {
        return this.authService.refresh(body?.refreshToken);
    }
    async logout(req) {
        await this.authService.bumpTokenVersion(req.user.id);
    }
    adminLogin(body) {
        return this.authService.adminLogin(body.username, body.password);
    }
    register(body) {
        return this.authService.register(body);
    }
    setup2fa(req) {
        return this.twoFactorService.setup(req.user.id);
    }
    enable2fa(req, body) {
        return this.twoFactorService.enable(req.user.id, body.code);
    }
    disable2fa(req, body) {
        return this.twoFactorService.disable(req.user.id, body.code);
    }
    loginVerify2fa(body) {
        return this.authService.loginVerify2fa(body.tempToken, body.code);
    }
    forgotPassword(body) {
        return this.authService.forgotPassword(body?.email);
    }
    resetPassword(body) {
        return this.authService.resetPassword(body?.token, body?.newPassword);
    }
    requestEmailVerification(req) {
        return this.authService.requestEmailVerification(req.user.id);
    }
    confirmEmailVerification(body) {
        return this.authService.confirmEmailVerification(body?.token);
    }
    requestSmsOtp(body) {
        return this.authService.requestSmsOtp(body?.phoneNumber);
    }
    verifySmsOtp(body) {
        return this.authService.verifySmsOtp(body?.phoneNumber, body?.code);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, throttler_1.Throttle)({ 'auth-login': { limit: 20, ttl: 60_000 } }),
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.HttpCode)(204),
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, throttler_1.Throttle)({ 'auth-login': { limit: 20, ttl: 60_000 } }),
    (0, common_1.Post)('admin/login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "adminLogin", null);
__decorate([
    (0, throttler_1.Throttle)({ 'auth-register': { limit: 3, ttl: 3_600_000 } }),
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('2fa/setup'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "setup2fa", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('2fa/enable'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "enable2fa", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('2fa/disable'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "disable2fa", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    (0, common_1.Post)('2fa/login-verify'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "loginVerify2fa", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 60_000 } }),
    (0, common_1.Post)('forgot-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('verify-email/request'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "requestEmailVerification", null);
__decorate([
    (0, common_1.Post)('verify-email/confirm'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "confirmEmailVerification", null);
__decorate([
    (0, throttler_1.Throttle)({ 'auth-login': { limit: 10, ttl: 60_000 } }),
    (0, common_1.Post)('sms/request'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "requestSmsOtp", null);
__decorate([
    (0, common_1.Post)('sms/verify'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "verifySmsOtp", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        two_factor_service_1.TwoFactorService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map