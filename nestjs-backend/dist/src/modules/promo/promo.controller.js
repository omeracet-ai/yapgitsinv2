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
exports.PromoController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const admin_guard_1 = require("../../common/guards/admin.guard");
const admin_audit_service_1 = require("../admin-audit/admin-audit.service");
const promo_service_1 = require("./promo.service");
function uid(req) {
    return req.user?.sub || req.user?.id || req.user?.userId || '';
}
let PromoController = class PromoController {
    svc;
    audit;
    constructor(svc, audit) {
        this.svc = svc;
        this.audit = audit;
    }
    validate(code, spend, req) {
        const spendNum = spend ? Number(spend) : 0;
        return this.svc.validate(code, uid(req), Number.isFinite(spendNum) ? spendNum : 0);
    }
    async validateByPath(code, req) {
        try {
            const result = await this.svc.validate(code, uid(req), 0);
            const promo = await this.svc.findOne(result.codeId);
            return {
                valid: true,
                discount: result.discountValue,
                type: result.discountType,
                description: promo.description ?? '',
            };
        }
        catch {
            return { valid: false, discount: 0, type: 'percent', description: '' };
        }
    }
    async applyByPath(code, req) {
        const result = await this.svc.redeemByCode(code, uid(req));
        return {
            success: true,
            tokensAdded: result.type === 'bonus_token' ? result.value : undefined,
        };
    }
    redeem(body, req) {
        return this.svc.redeemByCode(body?.code ?? '', uid(req));
    }
    adminList(page, limit) {
        return this.svc.adminList(Number(page) || 1, Number(limit) || 50);
    }
    async adminCreate(body, req) {
        const promo = await this.svc.adminCreate(body);
        await this.audit.logAction(uid(req), 'promo.create', 'promo_code', promo.id, {
            code: promo.code,
            type: promo.effectType,
            value: promo.effectValue,
        });
        return promo;
    }
    async adminUpdate(id, body, req) {
        const promo = await this.svc.adminUpdate(id, body);
        await this.audit.logAction(uid(req), 'promo.update', 'promo_code', id, body);
        return promo;
    }
    async adminDelete(id, req) {
        const result = await this.svc.remove(id);
        await this.audit.logAction(uid(req), 'promo.delete', 'promo_code', id);
        return result;
    }
};
exports.PromoController = PromoController;
__decorate([
    (0, common_1.Get)('promo/validate/:code'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Query)('spend')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], PromoController.prototype, "validate", null);
__decorate([
    (0, common_1.Get)('promo/:code/validate'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PromoController.prototype, "validateByPath", null);
__decorate([
    (0, common_1.Post)('promo/:code/apply'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PromoController.prototype, "applyByPath", null);
__decorate([
    (0, common_1.Post)('promo/redeem'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PromoController.prototype, "redeem", null);
__decorate([
    (0, common_1.Get)('admin/promos'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), admin_guard_1.AdminGuard),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PromoController.prototype, "adminList", null);
__decorate([
    (0, common_1.Post)('admin/promos'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), admin_guard_1.AdminGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PromoController.prototype, "adminCreate", null);
__decorate([
    (0, common_1.Patch)('admin/promos/:id'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), admin_guard_1.AdminGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PromoController.prototype, "adminUpdate", null);
__decorate([
    (0, common_1.Delete)('admin/promos/:id'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), admin_guard_1.AdminGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PromoController.prototype, "adminDelete", null);
exports.PromoController = PromoController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [promo_service_1.PromoService,
        admin_audit_service_1.AdminAuditService])
], PromoController);
//# sourceMappingURL=promo.controller.js.map