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
exports.CalendarPublicController = exports.CalendarController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const throttler_1 = require("@nestjs/throttler");
const calendar_service_1 = require("./calendar.service");
let CalendarController = class CalendarController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async getIcs(req) {
        const userId = req.user.id;
        const bookings = await this.svc.findWorkerBookings(userId);
        return this.svc.generateIcs(bookings);
    }
    async createToken(req) {
        const userId = req.user.id;
        const token = await this.svc.rotateCalendarToken(userId);
        const base = process.env.PUBLIC_API_URL || 'https://api.yapgitsin.tr';
        return { token, url: `${base}/calendar/${token}/feed.ics` };
    }
    async revokeToken(req) {
        await this.svc.revokeCalendarToken(req.user.id);
        return { ok: true };
    }
};
exports.CalendarController = CalendarController;
__decorate([
    (0, common_1.Get)('calendar.ics'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Header)('Content-Type', 'text/calendar; charset=utf-8'),
    (0, common_1.Header)('Content-Disposition', 'attachment; filename="yapgitsin-calendar.ics"'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "getIcs", null);
__decorate([
    (0, common_1.Post)('calendar/token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "createToken", null);
__decorate([
    (0, common_1.Delete)('calendar/token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "revokeToken", null);
exports.CalendarController = CalendarController = __decorate([
    (0, common_1.Controller)('users/me'),
    __metadata("design:paramtypes", [calendar_service_1.CalendarService])
], CalendarController);
let CalendarPublicController = class CalendarPublicController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async publicFeed(token, res) {
        const user = await this.svc.findUserByCalendarToken(token);
        if (!user)
            throw new common_1.NotFoundException('Calendar feed not found');
        const bookings = await this.svc.findWorkerBookings(user.id);
        const body = this.svc.generateIcs(bookings);
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="yapgitsin-calendar.ics"');
        res.send(body);
    }
};
exports.CalendarPublicController = CalendarPublicController;
__decorate([
    (0, common_1.Get)(':token/feed.ics'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CalendarPublicController.prototype, "publicFeed", null);
exports.CalendarPublicController = CalendarPublicController = __decorate([
    (0, common_1.Controller)('calendar'),
    __metadata("design:paramtypes", [calendar_service_1.CalendarService])
], CalendarPublicController);
//# sourceMappingURL=calendar.controller.js.map