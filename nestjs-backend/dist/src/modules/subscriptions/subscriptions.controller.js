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
exports.SubscriptionsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const subscriptions_service_1 = require("./subscriptions.service");
let SubscriptionsController = class SubscriptionsController {
    subsService;
    constructor(subsService) {
        this.subsService = subsService;
    }
    async listPlans() {
        const plans = await this.subsService.listPlans();
        return plans.map((p) => ({
            key: p.key,
            name: p.name,
            price: p.price,
            period: p.period,
            features: p.features,
        }));
    }
    async getMy(req) {
        const sub = await this.subsService.getMySubscription(req.user.id);
        if (!sub)
            return null;
        return {
            plan: {
                key: sub.plan.key,
                name: sub.plan.name,
                price: sub.plan.price,
                period: sub.plan.period,
                features: sub.plan.features,
            },
            status: sub.status,
            startedAt: sub.startedAt,
            expiresAt: sub.expiresAt,
            cancelledAt: sub.cancelledAt,
        };
    }
    async subscribe(req, body) {
        if (!body?.planKey)
            throw new common_1.BadRequestException('planKey zorunlu');
        const r = await this.subsService.subscribe(req.user.id, body.planKey);
        return {
            subscriptionId: r.subscriptionId,
            paymentUrl: r.paymentUrl,
            paymentToken: r.paymentToken,
            mock: r.mock,
        };
    }
    async confirm(req, body) {
        if (!body?.token)
            throw new common_1.BadRequestException('token zorunlu');
        return this.subsService.confirmPayment(req.user.id, body.token);
    }
    async cancel(req) {
        return this.subsService.cancel(req.user.id);
    }
};
exports.SubscriptionsController = SubscriptionsController;
__decorate([
    (0, common_1.Get)('plans'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "listPlans", null);
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getMy", null);
__decorate([
    (0, common_1.Post)('subscribe'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "subscribe", null);
__decorate([
    (0, common_1.Post)('confirm'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "confirm", null);
__decorate([
    (0, common_1.Post)('cancel'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "cancel", null);
exports.SubscriptionsController = SubscriptionsController = __decorate([
    (0, swagger_1.ApiTags)('subscriptions'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('subscriptions'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [subscriptions_service_1.SubscriptionsService])
], SubscriptionsController);
//# sourceMappingURL=subscriptions.controller.js.map