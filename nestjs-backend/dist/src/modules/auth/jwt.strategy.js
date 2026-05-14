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
var JwtStrategy_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtStrategy = void 0;
const passport_jwt_1 = require("passport-jwt");
const passport_1 = require("@nestjs/passport");
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const users_service_1 = require("../users/users.service");
const jwt_secrets_1 = require("./jwt-secrets");
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    static { JwtStrategy_1 = this; }
    usersService;
    cacheManager;
    static TOKEN_VER_TTL_MS = 60_000;
    constructor(usersService, cacheManager) {
        (0, jwt_secrets_1.getJwtSigningSecret)();
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromExtractors([
                passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
                (req) => req?.query?.token,
            ]),
            ignoreExpiration: false,
            secretOrKeyProvider: jwt_secrets_1.jwtSecretOrKeyProvider,
        });
        this.usersService = usersService;
        this.cacheManager = cacheManager;
    }
    cacheKey(userId) {
        return `user:tokenVer:${userId}`;
    }
    async validate(payload) {
        const user = await this.usersService.findById(payload.sub);
        if (!user)
            throw new common_1.UnauthorizedException('Kullanıcı bulunamadı');
        if (user.suspended) {
            throw new common_1.UnauthorizedException('Hesabınız askıya alındı');
        }
        if (user.deactivated) {
            throw new common_1.UnauthorizedException('Hesap silindi');
        }
        const tokenVer = payload.tokenVersion ?? 0;
        const currentVer = user.tokenVersion ?? 0;
        await this.cacheManager.set(this.cacheKey(user.id), currentVer, JwtStrategy_1.TOKEN_VER_TTL_MS);
        if (tokenVer !== currentVer) {
            throw new common_1.UnauthorizedException('Token revoked');
        }
        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            tenantId: payload.tenantId ?? null,
            city: user.city ?? undefined,
        };
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = JwtStrategy_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [users_service_1.UsersService, Object])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map