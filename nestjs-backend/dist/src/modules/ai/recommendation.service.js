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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RecommendationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const job_entity_1 = require("../jobs/job.entity");
const user_entity_1 = require("../users/user.entity");
let RecommendationService = RecommendationService_1 = class RecommendationService {
    jobsRepo;
    usersRepo;
    configService;
    logger = new common_1.Logger(RecommendationService_1.name);
    client;
    constructor(jobsRepo, usersRepo, configService) {
        this.jobsRepo = jobsRepo;
        this.usersRepo = usersRepo;
        this.configService = configService;
        this.client = new sdk_1.default({
            apiKey: this.configService.get('ANTHROPIC_API_KEY'),
        });
    }
    async recommendWorkersForJob(jobId) {
        const job = await this.jobsRepo.findOne({ where: { id: jobId } });
        if (!job)
            throw new common_1.NotFoundException('İlan bulunamadı');
        const workers = await this.usersRepo
            .createQueryBuilder('u')
            .where(`u.workerCategories LIKE :cat`, { cat: `%${job.category}%` })
            .andWhere('u.asWorkerTotal >= 0')
            .orderBy('u.wilsonScore', 'DESC')
            .limit(20)
            .getMany();
        if (workers.length === 0)
            return [];
        const workerList = workers.map((w) => ({
            id: w.id,
            name: w.fullName,
            rating: w.averageRating,
            skills: (w.workerCategories ?? []).join(', '),
            completedJobs: w.asWorkerSuccess,
        }));
        const prompt = `Job: ${job.title}, ${job.description ?? ''}
Workers: ${JSON.stringify(workerList)}
Return JSON array of top 5 worker IDs ranked by fit. Only IDs, no explanation. Example: ["id1","id2","id3","id4","id5"]`;
        try {
            const response = await this.client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 200,
                system: [
                    {
                        type: 'text',
                        text: 'You are a job matching AI. Rank workers by fit for a job. Return only a JSON array of worker IDs.',
                        cache_control: { type: 'ephemeral' },
                    },
                ],
                messages: [{ role: 'user', content: prompt }],
            });
            const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
            const rankedIds = JSON.parse(text.match(/\[.*\]/s)?.[0] ?? '[]');
            const idToWorker = new Map(workers.map((w) => [w.id, w]));
            return rankedIds
                .filter((id) => idToWorker.has(id))
                .map((id) => idToWorker.get(id))
                .slice(0, 5);
        }
        catch (err) {
            this.logger.warn(`Haiku ranking failed: ${String(err)}`);
            return workers.slice(0, 5);
        }
    }
    async recommendJobsForWorker(workerId) {
        const worker = await this.usersRepo.findOne({ where: { id: workerId } });
        if (!worker)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        const categories = worker.workerCategories ?? [];
        let query = this.jobsRepo
            .createQueryBuilder('j')
            .where('j.status = :status', { status: job_entity_1.JobStatus.OPEN })
            .orderBy('j.createdAt', 'DESC')
            .limit(20);
        if (categories.length > 0) {
            query = query.andWhere(`(${categories.map((_, i) => `j.category LIKE :cat${i}`).join(' OR ')})`, Object.fromEntries(categories.map((c, i) => [`cat${i}`, `%${c}%`])));
        }
        const jobs = await query.getMany();
        if (jobs.length === 0)
            return [];
        const jobList = jobs.map((j) => ({
            id: j.id,
            title: j.title,
            category: j.category,
            location: j.location,
        }));
        const prompt = `Worker skills: ${categories.join(', ')}
Open jobs: ${JSON.stringify(jobList)}
Return JSON array of top 5 job IDs ranked by fit. Only IDs, no explanation. Example: ["id1","id2","id3","id4","id5"]`;
        try {
            const response = await this.client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 200,
                system: [
                    {
                        type: 'text',
                        text: 'You are a job matching AI. Rank jobs by fit for a worker. Return only a JSON array of job IDs.',
                        cache_control: { type: 'ephemeral' },
                    },
                ],
                messages: [{ role: 'user', content: prompt }],
            });
            const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
            const rankedIds = JSON.parse(text.match(/\[.*\]/s)?.[0] ?? '[]');
            const idToJob = new Map(jobs.map((j) => [j.id, j]));
            return rankedIds
                .filter((id) => idToJob.has(id))
                .map((id) => idToJob.get(id))
                .slice(0, 5);
        }
        catch (err) {
            this.logger.warn(`Haiku ranking failed: ${String(err)}`);
            return jobs.slice(0, 5);
        }
    }
};
exports.RecommendationService = RecommendationService;
exports.RecommendationService = RecommendationService = RecommendationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        config_1.ConfigService])
], RecommendationService);
//# sourceMappingURL=recommendation.service.js.map