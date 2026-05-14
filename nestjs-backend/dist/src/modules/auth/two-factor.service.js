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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoFactorService = void 0;
const common_1 = require("@nestjs/common");
const otplib_1 = require("otplib");
const QRCode = __importStar(require("qrcode"));
const users_service_1 = require("../users/users.service");
let TwoFactorService = class TwoFactorService {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    async setup(userId) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        const secret = otplib_1.authenticator.generateSecret();
        await this.usersService.update(userId, {
            twoFactorSecret: secret,
            twoFactorEnabled: false,
        });
        const accountName = user.email || user.phoneNumber;
        const otpauthUrl = otplib_1.authenticator.keyuri(accountName, 'Yapgitsin', secret);
        const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
        return { secret, otpauthUrl, qrDataUrl };
    }
    async enable(userId, token) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        if (!user.twoFactorSecret) {
            throw new common_1.BadRequestException('Önce 2FA setup yapılmalı');
        }
        const ok = otplib_1.authenticator.check(token, user.twoFactorSecret);
        if (!ok)
            throw new common_1.BadRequestException('Kod yanlış');
        await this.usersService.update(userId, { twoFactorEnabled: true });
        return { enabled: true };
    }
    async disable(userId, token) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        if (!user.twoFactorEnabled || !user.twoFactorSecret) {
            throw new common_1.BadRequestException('2FA aktif değil');
        }
        const ok = otplib_1.authenticator.check(token, user.twoFactorSecret);
        if (!ok)
            throw new common_1.BadRequestException('Kod yanlış');
        await this.usersService.update(userId, {
            twoFactorEnabled: false,
            twoFactorSecret: null,
        });
        return { enabled: false };
    }
    async verify(userId, token) {
        const user = await this.usersService.findById(userId);
        if (!user || !user.twoFactorSecret)
            return false;
        return otplib_1.authenticator.check(token, user.twoFactorSecret);
    }
};
exports.TwoFactorService = TwoFactorService;
exports.TwoFactorService = TwoFactorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], TwoFactorService);
//# sourceMappingURL=two-factor.service.js.map