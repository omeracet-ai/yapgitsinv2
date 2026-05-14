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
exports.JobTemplatesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_template_entity_1 = require("./job-template.entity");
const jobs_service_1 = require("../jobs/jobs.service");
let JobTemplatesService = class JobTemplatesService {
    repo;
    jobsService;
    constructor(repo, jobsService) {
        this.repo = repo;
        this.jobsService = jobsService;
    }
    findMy(userId) {
        return this.repo.find({
            where: { userId },
            order: { useCount: 'DESC', createdAt: 'DESC' },
        });
    }
    async findOne(id, userId) {
        const tpl = await this.repo.findOne({ where: { id } });
        if (!tpl)
            throw new common_1.NotFoundException('Şablon bulunamadı');
        if (tpl.userId !== userId)
            throw new common_1.ForbiddenException('Bu şablona erişim yok');
        return tpl;
    }
    async create(dto, userId) {
        const tpl = this.repo.create({ ...dto, userId });
        return this.repo.save(tpl);
    }
    async update(id, dto, userId) {
        const tpl = await this.findOne(id, userId);
        Object.assign(tpl, dto);
        return this.repo.save(tpl);
    }
    async remove(id, userId) {
        const tpl = await this.findOne(id, userId);
        await this.repo.remove(tpl);
        return { success: true };
    }
    async instantiate(templateId, userId) {
        const tpl = await this.findOne(templateId, userId);
        const createJobDto = {
            title: tpl.title,
            description: tpl.description,
            category: tpl.category,
            location: tpl.location,
            budgetMin: tpl.budgetMin ?? undefined,
            budgetMax: tpl.budgetMax ?? undefined,
            photos: tpl.photos ?? undefined,
        };
        const job = await this.jobsService.create(createJobDto, userId);
        tpl.useCount = (tpl.useCount ?? 0) + 1;
        await this.repo.save(tpl);
        return job;
    }
};
exports.JobTemplatesService = JobTemplatesService;
exports.JobTemplatesService = JobTemplatesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_template_entity_1.JobTemplate)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jobs_service_1.JobsService])
], JobTemplatesService);
//# sourceMappingURL=job-templates.service.js.map