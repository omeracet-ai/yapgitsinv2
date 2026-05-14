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
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const payments_service_1 = require("./payments.service");
const passport_1 = require("@nestjs/passport");
const create_payment_intent_dto_1 = require("./dto/create-payment-intent.dto");
const confirm_payment_dto_1 = require("./dto/confirm-payment.dto");
const payment_history_dto_1 = require("./dto/payment-history.dto");
const refund_payment_dto_1 = require("./dto/refund-payment.dto");
const escrow_service_1 = require("../escrow/escrow.service");
let PaymentsController = class PaymentsController {
    paymentsService;
    escrowService;
    constructor(paymentsService, escrowService) {
        this.paymentsService = paymentsService;
        this.escrowService = escrowService;
    }
    async createPaymentIntent(req, dto) {
        return this.paymentsService.createPaymentIntent(req.user.id, dto);
    }
    async confirmPayment(req, dto) {
        return this.paymentsService.confirmPayment(req.user.id, dto);
    }
    async getPaymentHistory(req, query) {
        return this.paymentsService.getPaymentHistory(req.user.id, query, false);
    }
    async getEarnings(req) {
        return this.paymentsService.getWorkerEarnings(req.user.id);
    }
    async refundPayment(req, dto) {
        return this.paymentsService.refundPayment(req.user.id, dto);
    }
    async createSession(body) {
        return this.paymentsService.createCheckoutForm(body);
    }
    async callback(body, res) {
        const result = await this.paymentsService.retrieveCheckoutResult(body.token);
        if (result.status === 'success') {
            return res.redirect('yapgitsin://payment-success');
        }
        else {
            return res.redirect('yapgitsin://payment-failure');
        }
    }
    async iyzipayCallback(body) {
        const token = body?.token;
        if (!token)
            throw new common_1.BadRequestException('Missing token');
        const escrow = await this.escrowService.confirmByToken(token);
        return { status: escrow.paymentStatus, escrowId: escrow.id };
    }
    async handleWebhook(event) {
        await this.paymentsService.handlePaymentWebhook(event);
        return { received: true };
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    (0, common_1.Post)('create-intent'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_payment_intent_dto_1.CreatePaymentIntentDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "createPaymentIntent", null);
__decorate([
    (0, common_1.Post)('confirm'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, confirm_payment_dto_1.ConfirmPaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "confirmPayment", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, payment_history_dto_1.PaymentHistoryQueryDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getPaymentHistory", null);
__decorate([
    (0, common_1.Get)('earnings'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getEarnings", null);
__decorate([
    (0, common_1.Post)('refund'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, refund_payment_dto_1.RefundPaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "refundPayment", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    (0, common_1.Post)('create-session'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "createSession", null);
__decorate([
    (0, common_1.Post)('callback'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "callback", null);
__decorate([
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.Post)('iyzipay/callback'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "iyzipayCallback", null);
__decorate([
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "handleWebhook", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService,
        escrow_service_1.EscrowService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map