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
exports.SavedJobsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const saved_job_entity_1 = require("./saved-job.entity");
const job_entity_1 = require("./job.entity");
const DESC_LIMIT = 200;
let SavedJobsService = class SavedJobsService {
    savedRepo;
    jobRepo;
    constructor(savedRepo, jobRepo) {
        this.savedRepo = savedRepo;
        this.jobRepo = jobRepo;
    }
    async saveJob(userId, jobId) {
        const job = await this.jobRepo.findOne({
            where: { id: jobId },
            select: ['id'],
        });
        if (!job)
            throw new common_1.NotFoundException('Job not found');
        try {
            await this.savedRepo.insert({ userId, jobId });
        }
        catch {
        }
        return { saved: true, jobId };
    }
    async unsaveJob(userId, jobId) {
        await this.savedRepo.delete({ userId, jobId });
        return { saved: false, jobId };
    }
    async listSaved(userId) {
        const rows = await this.savedRepo
            .createQueryBuilder('s')
            .innerJoinAndSelect('s.job', 'j')
            .where('s.userId = :userId', { userId })
            .orderBy('s.createdAt', 'DESC')
            .getMany();
        const data = rows.map((s) => {
            const j = s.job;
            const desc = j.description ?? '';
            return {
                id: j.id,
                title: j.title,
                description: desc.length > DESC_LIMIT ? desc.slice(0, DESC_LIMIT) + '…' : desc,
                category: j.category,
                location: j.location,
                budgetMin: j.budgetMin ?? null,
                budgetMax: j.budgetMax ?? null,
                status: j.status,
                photos: j.photos ?? null,
                customerId: j.customerId,
                createdAt: j.createdAt,
                dueDate: j.dueDate ?? null,
                savedAt: s.createdAt,
            };
        });
        return { data, total: data.length };
    }
};
exports.SavedJobsService = SavedJobsService;
exports.SavedJobsService = SavedJobsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(saved_job_entity_1.SavedJob)),
    __param(1, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], SavedJobsService);
//# sourceMappingURL=saved-jobs.service.js.map