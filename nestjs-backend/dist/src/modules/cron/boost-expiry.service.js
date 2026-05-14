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
var BoostExpiryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoostExpiryService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("../jobs/job.entity");
let BoostExpiryService = BoostExpiryService_1 = class BoostExpiryService {
    jobRepo;
    logger = new common_1.Logger(BoostExpiryService_1.name);
    constructor(jobRepo) {
        this.jobRepo = jobRepo;
    }
    async expireBoosts() {
        const now = new Date();
        const expired = await this.jobRepo.find({
            where: { featuredUntil: (0, typeorm_2.LessThan)(now), featuredOrder: (0, typeorm_2.Not)((0, typeorm_2.IsNull)()) },
        });
        for (const job of expired) {
            job.featuredOrder = null;
            job.featuredUntil = null;
        }
        if (expired.length > 0) {
            await this.jobRepo.save(expired);
        }
        this.logger.log(`[BoostExpiry] expired ${expired.length} jobs`);
    }
};
exports.BoostExpiryService = BoostExpiryService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BoostExpiryService.prototype, "expireBoosts", null);
exports.BoostExpiryService = BoostExpiryService = BoostExpiryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], BoostExpiryService);
//# sourceMappingURL=boost-expiry.service.js.map