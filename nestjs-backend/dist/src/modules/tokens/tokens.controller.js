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
exports.TokensController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const tokens_service_1 = require("./tokens.service");
const wallet_pdf_service_1 = require("./wallet-pdf.service");
const token_transaction_entity_1 = require("./token-transaction.entity");
const gift_tokens_dto_1 = require("./dto/gift-tokens.dto");
let TokensController = class TokensController {
    svc;
    pdfSvc;
    constructor(svc, pdfSvc) {
        this.svc = svc;
        this.pdfSvc = pdfSvc;
    }
    async historyPdf(req, from, to, res) {
        const fromDate = from ? new Date(from) : undefined;
        const toDate = to ? new Date(to) : undefined;
        const buf = await this.pdfSvc.generatePdf(req.user.id, fromDate, toDate);
        const dateStr = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="yapgitsin-cuzdan-${req.user.id}-${dateStr}.pdf"`);
        res.setHeader('Content-Length', buf.length.toString());
        res.end(buf);
    }
    getBalance(req) {
        return this.svc.getBalance(req.user.id);
    }
    getHistory(req) {
        return this.svc.getHistory(req.user.id);
    }
    purchase(req, body) {
        const method = body.paymentMethod === 'bank' ? token_transaction_entity_1.PaymentMethod.BANK : token_transaction_entity_1.PaymentMethod.CRYPTO;
        return this.svc.purchase(req.user.id, body.amount, method);
    }
    gift(req, dto) {
        return this.svc.giftTokens(req.user.id, dto);
    }
};
exports.TokensController = TokensController;
__decorate([
    (0, common_1.Get)('history/pdf'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], TokensController.prototype, "historyPdf", null);
__decorate([
    (0, common_1.Get)('balance'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TokensController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TokensController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)('purchase'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], TokensController.prototype, "purchase", null);
__decorate([
    (0, common_1.Post)('gift'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, gift_tokens_dto_1.GiftTokensDto]),
    __metadata("design:returntype", void 0)
], TokensController.prototype, "gift", null);
exports.TokensController = TokensController = __decorate([
    (0, common_1.Controller)('tokens'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [tokens_service_1.TokensService,
        wallet_pdf_service_1.WalletPdfService])
], TokensController);
//# sourceMappingURL=tokens.controller.js.map