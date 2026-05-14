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
exports.EscrowController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const passport_1 = require("@nestjs/passport");
const escrow_service_1 = require("./escrow.service");
class InitiateEscrowDto {
    jobId;
    offerId;
    taskerId;
    amount;
    paymentToken;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], InitiateEscrowDto.prototype, "jobId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], InitiateEscrowDto.prototype, "offerId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], InitiateEscrowDto.prototype, "taskerId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], InitiateEscrowDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], InitiateEscrowDto.prototype, "paymentToken", void 0);
class ConfirmEscrowDto {
    paymentToken;
    paymentRef;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ConfirmEscrowDto.prototype, "paymentToken", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ConfirmEscrowDto.prototype, "paymentRef", void 0);
class DisputeDto {
    reason;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], DisputeDto.prototype, "reason", void 0);
class ReleaseDto {
    reason;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], ReleaseDto.prototype, "reason", void 0);
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
let EscrowController = class EscrowController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    listMy(req) {
        return this.svc.listMy(req.user.id);
    }
    async initiate(dto, req) {
        if (!dto || !dto.jobId)
            throw new common_1.BadRequestException('Invalid payload');
        const result = await this.svc.initiate({
            jobId: dto.jobId,
            offerId: dto.offerId,
            amount: dto.amount,
            customerId: req.user.id,
            taskerId: dto.taskerId,
            paymentToken: dto.paymentToken,
        });
        return {
            escrow: this.svc.withFeeBreakdown(result.escrow),
            feeBreakdown: this.svc.feeBreakdownFor(result.escrow),
            paymentInitUrl: result.paymentInitUrl,
            paymentToken: result.paymentToken,
            checkoutFormContent: result.checkoutFormContent,
            mock: result.mock,
        };
    }
    confirm(dto) {
        return this.svc.confirm(dto.paymentToken, dto.paymentRef);
    }
    release(id, dto, req) {
        return this.svc.release(id, req.user.id, dto?.reason, req.user.role);
    }
    disputePost(id, dto, req) {
        return this.svc.dispute(id, req.user.id, dto?.reason);
    }
    listAsCustomer(req) {
        return this.svc.listForCustomer(req.user.id);
    }
    listAsTasker(req) {
        return this.svc.listForTasker(req.user.id);
    }
    async getByJob(jobId, req) {
        const escrow = await this.svc.getByJob(jobId, req.user.id, req.user.role);
        if (!escrow) {
            throw new common_1.NotFoundException('No escrow found for this job');
        }
        return this.svc.withFeeBreakdown(escrow);
    }
    async getById(id, req) {
        const escrow = await this.svc.getById(id, req.user.id, req.user.role);
        return this.svc.withFeeBreakdown(escrow);
    }
    dispute(id, body, req) {
        return this.svc.dispute(id, req.user.id, body?.reason);
    }
};
exports.EscrowController = EscrowController;
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EscrowController.prototype, "listMy", null);
__decorate([
    (0, common_1.Post)('initiate'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [InitiateEscrowDto, Object]),
    __metadata("design:returntype", Promise)
], EscrowController.prototype, "initiate", null);
__decorate([
    (0, common_1.Post)('confirm'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ConfirmEscrowDto]),
    __metadata("design:returntype", void 0)
], EscrowController.prototype, "confirm", null);
__decorate([
    (0, common_1.Post)(':id/release'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ReleaseDto, Object]),
    __metadata("design:returntype", void 0)
], EscrowController.prototype, "release", null);
__decorate([
    (0, common_1.Post)(':id/dispute'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, DisputeDto, Object]),
    __metadata("design:returntype", void 0)
], EscrowController.prototype, "disputePost", null);
__decorate([
    (0, common_1.Get)('my-as-customer'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EscrowController.prototype, "listAsCustomer", null);
__decorate([
    (0, common_1.Get)('my-as-tasker'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EscrowController.prototype, "listAsTasker", null);
__decorate([
    (0, common_1.Get)('by-job/:jobId'),
    __param(0, (0, common_1.Param)('jobId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EscrowController.prototype, "getByJob", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EscrowController.prototype, "getById", null);
__decorate([
    (0, common_1.Patch)(':id/dispute'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], EscrowController.prototype, "dispute", null);
exports.EscrowController = EscrowController = __decorate([
    (0, common_1.Controller)('escrow'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [escrow_service_1.EscrowService])
], EscrowController);
//# sourceMappingURL=escrow.controller.js.map