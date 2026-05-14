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
exports.UserBlocksController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const user_blocks_service_1 = require("./user-blocks.service");
const report_user_dto_1 = require("./dto/report-user.dto");
let UserBlocksController = class UserBlocksController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async blockMe(req, userId) {
        await this.svc.block(req.user.id, userId);
        return { blocked: true, blockedId: userId };
    }
    unblockMe(req, userId) {
        return this.svc.unblockIdempotent(req.user.id, userId);
    }
    listMyBlocks(req) {
        return this.svc.listBlockedPaged(req.user.id);
    }
    async reportUser(req, userId, body) {
        const r = await this.svc.report(req.user.id, userId, body.reason, body.description);
        return { id: r.id, status: r.status };
    }
    block(req, id) {
        return this.svc.block(req.user.id, id);
    }
    unblock(req, id) {
        return this.svc.unblock(req.user.id, id);
    }
    listBlocked(req) {
        return this.svc.listBlocked(req.user.id);
    }
};
exports.UserBlocksController = UserBlocksController;
__decorate([
    (0, common_1.Post)('users/me/blocks/:userId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UserBlocksController.prototype, "blockMe", null);
__decorate([
    (0, common_1.Delete)('users/me/blocks/:userId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], UserBlocksController.prototype, "unblockMe", null);
__decorate([
    (0, common_1.Get)('users/me/blocks'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserBlocksController.prototype, "listMyBlocks", null);
__decorate([
    (0, common_1.Post)('users/:userId/report'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, report_user_dto_1.ReportUserDto]),
    __metadata("design:returntype", Promise)
], UserBlocksController.prototype, "reportUser", null);
__decorate([
    (0, common_1.Post)('users/:id/block'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], UserBlocksController.prototype, "block", null);
__decorate([
    (0, common_1.Delete)('users/:id/block'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], UserBlocksController.prototype, "unblock", null);
__decorate([
    (0, common_1.Get)('users/me/blocked'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserBlocksController.prototype, "listBlocked", null);
exports.UserBlocksController = UserBlocksController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [user_blocks_service_1.UserBlocksService])
], UserBlocksController);
//# sourceMappingURL=user-blocks.controller.js.map