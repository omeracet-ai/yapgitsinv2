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
exports.AdminGeneralDisputesController = exports.GeneralDisputesController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const general_disputes_service_1 = require("./general-disputes.service");
const dispute_entity_1 = require("./dispute.entity");
const admin_audit_service_1 = require("../admin-audit/admin-audit.service");
function uid(req) {
    return req.user.sub || req.user.userId || req.user.id || '';
}
function ensureAdmin(req) {
    if (req.user.role !== 'admin')
        throw new common_1.ForbiddenException('Admin only');
}
let GeneralDisputesController = class GeneralDisputesController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    create(req, body) {
        return this.svc.create(uid(req), body);
    }
    mine(req) {
        return this.svc.findMine(uid(req));
    }
};
exports.GeneralDisputesController = GeneralDisputesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], GeneralDisputesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('mine'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GeneralDisputesController.prototype, "mine", null);
exports.GeneralDisputesController = GeneralDisputesController = __decorate([
    (0, common_1.Controller)('disputes'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [general_disputes_service_1.GeneralDisputesService])
], GeneralDisputesController);
let AdminGeneralDisputesController = class AdminGeneralDisputesController {
    svc;
    audit;
    constructor(svc, audit) {
        this.svc = svc;
        this.audit = audit;
    }
    list(req, status, page, limit) {
        ensureAdmin(req);
        return this.svc.findForAdmin(status, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 20);
    }
    async resolve(req, id, body) {
        ensureAdmin(req);
        const result = await this.svc.resolve(id, uid(req), body);
        await this.audit.logAction(uid(req), 'dispute.resolve', 'dispute', id, body);
        return result;
    }
};
exports.AdminGeneralDisputesController = AdminGeneralDisputesController;
__decorate([
    (0, common_1.Get)('list'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], AdminGeneralDisputesController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)('general/:id/resolve'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminGeneralDisputesController.prototype, "resolve", null);
exports.AdminGeneralDisputesController = AdminGeneralDisputesController = __decorate([
    (0, common_1.Controller)('admin/disputes'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [general_disputes_service_1.GeneralDisputesService,
        admin_audit_service_1.AdminAuditService])
], AdminGeneralDisputesController);
//# sourceMappingURL=general-disputes.controller.js.map