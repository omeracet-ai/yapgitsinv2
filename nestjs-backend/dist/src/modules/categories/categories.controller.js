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
exports.CategoriesController = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const categories_service_1 = require("./categories.service");
const category_search_service_1 = require("./category-search.service");
const CATEGORIES_LIST_TTL = 5 * 60 * 1000;
const CATEGORIES_LIST_KEY = 'categories:list';
const CATEGORY_SEARCH_TTL = 60 * 1000;
let CategoriesController = class CategoriesController {
    svc;
    searchSvc;
    cache;
    constructor(svc, searchSvc, cache) {
        this.svc = svc;
        this.searchSvc = searchSvc;
        this.cache = cache;
    }
    findAll() {
        return this.svc.findAll();
    }
    search(q, limit) {
        const lim = Math.min(Math.max(Number.parseInt(limit ?? '5', 10) || 5, 1), 20);
        return this.searchSvc.searchCategories(q ?? '', lim);
    }
    findOne(id) {
        return this.svc.findOne(id);
    }
    async create(body) {
        const cat = await this.svc.create(body);
        await this.searchSvc.rebuild();
        await this.invalidateListCache();
        return cat;
    }
    async update(id, body) {
        const cat = await this.svc.update(id, body);
        await this.searchSvc.rebuild();
        await this.invalidateListCache();
        return cat;
    }
    async remove(id) {
        await this.svc.remove(id);
        await this.searchSvc.rebuild();
        await this.invalidateListCache();
    }
    async invalidateListCache() {
        try {
            await this.cache.del(CATEGORIES_LIST_KEY);
        }
        catch {
        }
    }
};
exports.CategoriesController = CategoriesController;
__decorate([
    (0, common_1.Get)(),
    (0, cache_manager_1.CacheKey)(CATEGORIES_LIST_KEY),
    (0, cache_manager_1.CacheTTL)(CATEGORIES_LIST_TTL),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CategoriesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, cache_manager_1.CacheTTL)(CATEGORY_SEARCH_TTL),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Array)
], CategoriesController.prototype, "search", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CategoriesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "remove", null);
exports.CategoriesController = CategoriesController = __decorate([
    (0, common_1.Controller)('categories'),
    (0, common_1.UseInterceptors)(cache_manager_1.CacheInterceptor),
    __param(2, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [categories_service_1.CategoriesService,
        category_search_service_1.CategorySearchService, Object])
], CategoriesController);
//# sourceMappingURL=categories.controller.js.map