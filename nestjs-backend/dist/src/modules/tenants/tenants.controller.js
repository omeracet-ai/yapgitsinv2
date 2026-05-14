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
exports.TenantsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const tenants_service_1 = require("./tenants.service");
const super_admin_guard_1 = require("../../common/guards/super-admin.guard");
let TenantsController = class TenantsController {
    tenants;
    constructor(tenants) {
        this.tenants = tenants;
    }
    async current(req) {
        const t = req.tenant ?? (await this.tenants.getDefault());
        if (!t)
            return null;
        return {
            id: t.id,
            slug: t.slug,
            brandName: t.brandName,
            theme: t.theme,
            defaultCurrency: t.defaultCurrency,
            defaultLocale: t.defaultLocale,
        };
    }
    async list() {
        return this.tenants.list();
    }
    async create(body) {
        return this.tenants.create(body);
    }
    async update(id, body) {
        return this.tenants.update(id, body);
    }
};
exports.TenantsController = TenantsController;
__decorate([
    (0, common_1.Get)('tenants/current'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "current", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Get)('super-admin/tenants'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), super_admin_guard_1.SuperAdminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "list", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Post)('super-admin/tenants'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), super_admin_guard_1.SuperAdminGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Patch)('super-admin/tenants/:id'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), super_admin_guard_1.SuperAdminGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "update", null);
exports.TenantsController = TenantsController = __decorate([
    (0, swagger_1.ApiTags)('Tenants'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [tenants_service_1.TenantsService])
], TenantsController);
//# sourceMappingURL=tenants.controller.js.map