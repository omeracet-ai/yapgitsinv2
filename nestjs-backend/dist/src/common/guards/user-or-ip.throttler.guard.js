"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserOrIpThrottlerGuard = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
let UserOrIpThrottlerGuard = class UserOrIpThrottlerGuard extends throttler_1.ThrottlerGuard {
    canActivate(context) {
        const req = context.switchToHttp().getRequest();
        if (req?.method === 'OPTIONS')
            return Promise.resolve(true);
        return super.canActivate(context);
    }
    getTracker(req) {
        const user = req?.user;
        const sub = user?.sub ?? user?.id;
        if (sub)
            return Promise.resolve(`user:${String(sub)}`);
        const headers = (req?.headers ?? {});
        const xff = headers['x-forwarded-for'];
        const xffStr = Array.isArray(xff) ? xff[0] : xff;
        const ip = xffStr?.split(',')[0]?.trim() ??
            (typeof req?.ip === 'string' ? req.ip : 'unknown');
        return Promise.resolve(`ip:${ip}`);
    }
};
exports.UserOrIpThrottlerGuard = UserOrIpThrottlerGuard;
exports.UserOrIpThrottlerGuard = UserOrIpThrottlerGuard = __decorate([
    (0, common_1.Injectable)()
], UserOrIpThrottlerGuard);
//# sourceMappingURL=user-or-ip.throttler.guard.js.map