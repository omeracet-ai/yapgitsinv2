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
var StatsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("../jobs/job.entity");
const user_entity_1 = require("../users/user.entity");
const category_entity_1 = require("../categories/category.entity");
const CACHE_TTL_MS = 5 * 60 * 1_000;
let StatsService = StatsService_1 = class StatsService {
    jobRepo;
    userRepo;
    categoryRepo;
    logger = new common_1.Logger(StatsService_1.name);
    cache = new Map();
    constructor(jobRepo, userRepo, categoryRepo) {
        this.jobRepo = jobRepo;
        this.userRepo = userRepo;
        this.categoryRepo = categoryRepo;
    }
    async getPublicStats() {
        const cached = this.cache.get('public');
        if (cached && Date.now() < cached.expiresAt) {
            this.logger.debug('stats cache hit');
            return cached.data;
        }
        this.logger.debug('stats cache miss — querying DB');
        const [totalJobs, completedJobs, totalCategories, totalWorkers] = await Promise.all([
            this.jobRepo.count(),
            this.jobRepo.count({ where: { status: job_entity_1.JobStatus.COMPLETED } }),
            this.categoryRepo.count(),
            this.userRepo
                .createQueryBuilder('u')
                .where("u.workerCategories IS NOT NULL AND u.workerCategories != '[]'")
                .getCount(),
        ]);
        const data = {
            totalJobs,
            totalWorkers,
            completedJobs,
            totalCategories,
        };
        this.cache.set('public', { data, expiresAt: Date.now() + CACHE_TTL_MS });
        return data;
    }
};
exports.StatsService = StatsService;
exports.StatsService = StatsService = StatsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(category_entity_1.Category)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], StatsService);
//# sourceMappingURL=stats.service.js.map