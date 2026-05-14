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
exports.DisputesController = exports.AdminDisputesController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const disputes_service_1 = require("./disputes.service");
function uid(req) {
    return req.user.sub || req.user.userId || '';
}
function ensureAdmin(req) {
    if (req.user.role !== 'admin') {
        throw new common_1.ForbiddenException('Admin only');
    }
}
let AdminDisputesController = class AdminDisputesController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    list(req) {
        ensureAdmin(req);
        return this.svc.findOpenDisputes();
    }
    detail(req, id) {
        ensureAdmin(req);
        return this.svc.findById(id, uid(req), true);
    }
    markUnderReview(req, id) {
        ensureAdmin(req);
        return this.svc.markUnderReview(id, uid(req));
    }
    resolve(req, id, body) {
        ensureAdmin(req);
        return this.svc.resolve(id, uid(req), body);
    }
    dismiss(req, id, body) {
        ensureAdmin(req);
        return this.svc.dismiss(id, uid(req), body.notes);
    }
};
exports.AdminDisputesController = AdminDisputesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminDisputesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminDisputesController.prototype, "detail", null);
__decorate([
    (0, common_1.Patch)(':id/under-review'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminDisputesController.prototype, "markUnderReview", null);
__decorate([
    (0, common_1.Patch)(':id/resolve'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminDisputesController.prototype, "resolve", null);
__decorate([
    (0, common_1.Patch)(':id/dismiss'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminDisputesController.prototype, "dismiss", null);
exports.AdminDisputesController = AdminDisputesController = __decorate([
    (0, common_1.Controller)('admin/disputes'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [disputes_service_1.DisputesService])
], AdminDisputesController);
let DisputesController = class DisputesController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    my(req) {
        return this.svc.findMine(uid(req));
    }
    byJob(jobId) {
        return this.svc.findByJob(jobId);
    }
    detail(req, id) {
        const isAdmin = req.user.role === 'admin';
        return this.svc.findById(id, uid(req), isAdmin);
    }
};
exports.DisputesController = DisputesController;
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DisputesController.prototype, "my", null);
__decorate([
    (0, common_1.Get)('by-job/:jobId'),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DisputesController.prototype, "byJob", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DisputesController.prototype, "detail", null);
exports.DisputesController = DisputesController = __decorate([
    (0, common_1.Controller)('disputes'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [disputes_service_1.DisputesService])
], DisputesController);
//# sourceMappingURL=disputes.controller.js.map