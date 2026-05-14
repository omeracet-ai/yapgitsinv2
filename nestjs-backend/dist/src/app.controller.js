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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const app_service_1 = require("./app.service");
const user_entity_1 = require("./modules/users/user.entity");
const job_entity_1 = require("./modules/jobs/job.entity");
let AppController = class AppController {
    appService;
    usersRepo;
    jobsRepo;
    constructor(appService, usersRepo, jobsRepo) {
        this.appService = appService;
        this.usersRepo = usersRepo;
        this.jobsRepo = jobsRepo;
    }
    getHello() {
        return this.appService.getHello();
    }
    async getPublicStats() {
        const [totalUsers, totalJobs, totalWorkers] = await Promise.all([
            this.usersRepo.count(),
            this.jobsRepo.count(),
            this.usersRepo
                .createQueryBuilder('u')
                .where('u.workerCategories IS NOT NULL')
                .andWhere("u.workerCategories != '[]'")
                .andWhere("u.workerCategories != ''")
                .getCount(),
        ]);
        return { totalUsers, totalJobs, totalWorkers, ts: new Date().toISOString() };
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.Get)('stats/public'),
    (0, common_1.UseInterceptors)(cache_manager_1.CacheInterceptor),
    (0, cache_manager_1.CacheKey)('stats:public'),
    (0, cache_manager_1.CacheTTL)(5 * 60 * 1000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getPublicStats", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __metadata("design:paramtypes", [app_service_1.AppService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AppController);
//# sourceMappingURL=app.controller.js.map