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
exports.AiController = exports.AiPublicController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const throttler_1 = require("@nestjs/throttler");
const ai_service_1 = require("./ai.service");
const pricing_service_1 = require("./pricing.service");
const recommendation_service_1 = require("./recommendation.service");
const ai_dto_1 = require("./dto/ai.dto");
let AiPublicController = class AiPublicController {
    aiService;
    pricingService;
    constructor(aiService, pricingService) {
        this.aiService = aiService;
        this.pricingService = pricingService;
    }
    async generateCategoryDescription(dto) {
        return this.aiService.generateCategoryDescription(dto.category, dto.city, dto.length);
    }
    async priceSuggest(dto) {
        return this.pricingService.suggestPrice({
            category: dto.category,
            location: dto.location,
            description: dto.description,
            photos: dto.photos,
            customerType: dto.customerType,
        });
    }
};
exports.AiPublicController = AiPublicController;
__decorate([
    (0, common_1.Post)('generate-category-description'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ai_dto_1.GenerateCategoryDescriptionDto]),
    __metadata("design:returntype", Promise)
], AiPublicController.prototype, "generateCategoryDescription", null);
__decorate([
    (0, common_1.Post)('price-suggest'),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 3_600_000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ai_dto_1.PriceSuggestDto]),
    __metadata("design:returntype", Promise)
], AiPublicController.prototype, "priceSuggest", null);
exports.AiPublicController = AiPublicController = __decorate([
    (0, common_1.Controller)('ai'),
    __metadata("design:paramtypes", [ai_service_1.AiService,
        pricing_service_1.PricingService])
], AiPublicController);
let AiController = class AiController {
    aiService;
    recommendationService;
    constructor(aiService, recommendationService) {
        this.aiService = aiService;
        this.recommendationService = recommendationService;
    }
    async generateJobDescription(dto) {
        const description = await this.aiService.generateJobDescription(dto.title, dto.category, dto.location);
        return { description };
    }
    async chat(dto) {
        const reply = await this.aiService.chat(dto.message, dto.history);
        return { reply };
    }
    async summarizeReviews(dto) {
        const summary = await this.aiService.summarizeReviews(dto.reviews);
        return { summary };
    }
    async jobAssistant(dto) {
        return this.aiService.runJobAssistant(dto.title, dto.category, dto.location, dto.budgetHint);
    }
    async pricingAdvisor(dto) {
        return this.aiService.runPricingAdvisor(dto.category, dto.jobDetails, dto.location);
    }
    async supportAgent(dto, req) {
        const userRole = req.user?.role ?? 'customer';
        return {
            reply: await this.aiService.runSupportAgent(dto.message, dto.history, userRole),
        };
    }
    async recommendWorkers(jobId) {
        const workers = await this.recommendationService.recommendWorkersForJob(jobId);
        return {
            workers: workers.map((w) => ({
                id: w.id,
                fullName: w.fullName,
                averageRating: w.averageRating,
                totalReviews: w.totalReviews,
                asWorkerSuccess: w.asWorkerSuccess,
                workerCategories: w.workerCategories,
                workerBio: w.workerBio,
                profileImageUrl: w.profileImageUrl,
                city: w.city,
            })),
        };
    }
    async recommendJobs(workerId) {
        const jobs = await this.recommendationService.recommendJobsForWorker(workerId);
        return {
            jobs: jobs.map((j) => ({
                id: j.id,
                title: j.title,
                category: j.category,
                location: j.location,
                budgetMinMinor: j.budgetMinMinor,
                budgetMaxMinor: j.budgetMaxMinor,
                status: j.status,
                createdAt: j.createdAt,
            })),
        };
    }
    async assistant(body) {
        const { message, context } = body;
        const history = context ? [{ role: 'user', content: context }] : [];
        const result = await this.aiService.chat(message, history);
        return { text: result };
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Post)('generate-job-description'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ai_dto_1.GenerateJobDescriptionDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "generateJobDescription", null);
__decorate([
    (0, common_1.Post)('chat'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ai_dto_1.AiChatDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "chat", null);
__decorate([
    (0, common_1.Post)('summarize-reviews'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ai_dto_1.SummarizeReviewsDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "summarizeReviews", null);
__decorate([
    (0, common_1.Post)('job-assistant'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ai_dto_1.JobAssistantDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "jobAssistant", null);
__decorate([
    (0, common_1.Post)('pricing-advisor'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ai_dto_1.PricingAdvisorDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "pricingAdvisor", null);
__decorate([
    (0, common_1.Post)('support-agent'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ai_dto_1.SupportAgentDto, Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "supportAgent", null);
__decorate([
    (0, common_1.Get)('recommend/workers/:jobId'),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "recommendWorkers", null);
__decorate([
    (0, common_1.Get)('recommend/jobs/:workerId'),
    __param(0, (0, common_1.Param)('workerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "recommendJobs", null);
__decorate([
    (0, common_1.Post)('assistant'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "assistant", null);
exports.AiController = AiController = __decorate([
    (0, common_1.Controller)('ai'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [ai_service_1.AiService,
        recommendation_service_1.RecommendationService])
], AiController);
//# sourceMappingURL=ai.controller.js.map