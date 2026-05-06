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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
const categories_service_1 = require("../categories/categories.service");
const providers_service_1 = require("../providers/providers.service");
let AdminController = class AdminController {
    adminService;
    categoriesService;
    providersService;
    constructor(adminService, categoriesService, providersService) {
        this.adminService = adminService;
        this.categoriesService = categoriesService;
        this.providersService = providersService;
    }
    getStats() {
        return this.adminService.getDashboardStats();
    }
    getRecentJobs(limit) {
        return this.adminService.getRecentJobs(limit ? Number(limit) : 20);
    }
    setJobFeatured(id, body) {
        return this.adminService.setJobFeaturedOrder(id, body.featuredOrder ?? null);
    }
    getUsers() {
        return this.adminService.getAllUsers();
    }
    verifyUser(id, body) {
        return this.adminService.verifyUser(id, body.identityVerified);
    }
    getServiceRequests(limit) {
        return this.adminService.getAllServiceRequests(limit ? Number(limit) : 50);
    }
    setServiceRequestFeatured(id, body) {
        return this.adminService.setServiceRequestFeaturedOrder(id, body.featuredOrder ?? null);
    }
    getCategories() {
        return this.categoriesService.findAll();
    }
    updateCategory(id, body) {
        return this.categoriesService.update(id, body);
    }
    getProviders() {
        return this.providersService.findAll();
    }
    verifyProvider(id, body) {
        return this.providersService.setVerified(id, body.isVerified);
    }
    setProviderFeatured(id, body) {
        return this.providersService.setFeaturedOrder(id, body.featuredOrder ?? null);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('jobs'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getRecentJobs", null);
__decorate([
    (0, common_1.Patch)('jobs/:id/featured'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "setJobFeatured", null);
__decorate([
    (0, common_1.Get)('users'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Patch)('users/:id/verify'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "verifyUser", null);
__decorate([
    (0, common_1.Get)('service-requests'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getServiceRequests", null);
__decorate([
    (0, common_1.Patch)('service-requests/:id/featured'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "setServiceRequestFeatured", null);
__decorate([
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Patch)('categories/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Get)('providers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getProviders", null);
__decorate([
    (0, common_1.Patch)('providers/:id/verify'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "verifyProvider", null);
__decorate([
    (0, common_1.Patch)('providers/:id/featured'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "setProviderFeatured", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        categories_service_1.CategoriesService,
        providers_service_1.ProvidersService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map