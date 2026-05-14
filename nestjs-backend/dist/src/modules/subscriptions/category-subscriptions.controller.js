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
exports.CategorySubscriptionsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const category_subscriptions_service_1 = require("./category-subscriptions.service");
let CategorySubscriptionsController = class CategorySubscriptionsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async list(req) {
        const subs = await this.svc.listMine(req.user.id);
        return subs.map((s) => ({
            id: s.id,
            category: s.category,
            city: s.city,
            alertEnabled: s.alertEnabled,
            createdAt: s.createdAt,
        }));
    }
    async create(req, body) {
        const s = await this.svc.create(req.user.id, body.category, body.city);
        return {
            id: s.id,
            category: s.category,
            city: s.city,
            alertEnabled: s.alertEnabled,
            createdAt: s.createdAt,
        };
    }
    async remove(req, id) {
        return this.svc.remove(id, req.user.id);
    }
};
exports.CategorySubscriptionsController = CategorySubscriptionsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CategorySubscriptionsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CategorySubscriptionsController.prototype, "create", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CategorySubscriptionsController.prototype, "remove", null);
exports.CategorySubscriptionsController = CategorySubscriptionsController = __decorate([
    (0, swagger_1.ApiTags)('subscriptions'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('subscriptions/category'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [category_subscriptions_service_1.CategorySubscriptionsService])
], CategorySubscriptionsController);
//# sourceMappingURL=category-subscriptions.controller.js.map