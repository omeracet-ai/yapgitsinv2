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
exports.EscrowAdminController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const class_validator_1 = require("class-validator");
const escrow_service_1 = require("./escrow.service");
class AdminResolveDto {
    action;
    splitRatio;
    reason;
    adminNote;
}
__decorate([
    (0, class_validator_1.IsIn)(['release', 'refund', 'split']),
    __metadata("design:type", String)
], AdminResolveDto.prototype, "action", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(1),
    __metadata("design:type", Number)
], AdminResolveDto.prototype, "splitRatio", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], AdminResolveDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], AdminResolveDto.prototype, "adminNote", void 0);
class AdminReasonDto {
    reason;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], AdminReasonDto.prototype, "reason", void 0);
class AdminRefundDto {
    amount;
    reason;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], AdminRefundDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], AdminRefundDto.prototype, "reason", void 0);
let EscrowAdminController = class EscrowAdminController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    assertAdmin(req) {
        if (req.user.role !== 'admin') {
            throw new common_1.ForbiddenException('Admin role required');
        }
    }
    async listAll(req) {
        this.assertAdmin(req);
        return this.svc['repo'].find({ order: { createdAt: 'DESC' }, take: 200 });
    }
    async resolve(id, dto, req) {
        this.assertAdmin(req);
        return this.svc.adminResolve(id, dto.action, req.user.id, req.user.role, {
            splitRatio: dto.splitRatio,
            reason: dto.reason,
            adminNote: dto.adminNote,
        });
    }
    async release(id, dto, req) {
        this.assertAdmin(req);
        const escrow = await this.svc.release(id, req.user.id, dto?.reason, req.user.role);
        return this.svc.withFeeBreakdown(escrow);
    }
    async refund(id, dto, req) {
        this.assertAdmin(req);
        return this.svc.refund(id, req.user.id, dto?.amount, dto?.reason, req.user.role);
    }
};
exports.EscrowAdminController = EscrowAdminController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EscrowAdminController.prototype, "listAll", null);
__decorate([
    (0, common_1.Post)(':id/resolve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AdminResolveDto, Object]),
    __metadata("design:returntype", Promise)
], EscrowAdminController.prototype, "resolve", null);
__decorate([
    (0, common_1.Patch)(':id/release'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AdminReasonDto, Object]),
    __metadata("design:returntype", Promise)
], EscrowAdminController.prototype, "release", null);
__decorate([
    (0, common_1.Patch)(':id/refund'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AdminRefundDto, Object]),
    __metadata("design:returntype", Promise)
], EscrowAdminController.prototype, "refund", null);
exports.EscrowAdminController = EscrowAdminController = __decorate([
    (0, common_1.Controller)('admin/escrow'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [escrow_service_1.EscrowService])
], EscrowAdminController);
//# sourceMappingURL=escrow-admin.controller.js.map