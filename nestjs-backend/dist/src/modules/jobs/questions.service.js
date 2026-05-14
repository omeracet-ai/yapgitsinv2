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
exports.QuestionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_question_entity_1 = require("./job-question.entity");
const job_question_reply_entity_1 = require("./job-question-reply.entity");
const offer_entity_1 = require("./offer.entity");
const job_entity_1 = require("./job.entity");
const content_filter_service_1 = require("../moderation/content-filter.service");
let QuestionsService = class QuestionsService {
    questionsRepo;
    repliesRepo;
    offersRepo;
    jobsRepo;
    filter;
    constructor(questionsRepo, repliesRepo, offersRepo, jobsRepo, filter) {
        this.questionsRepo = questionsRepo;
        this.repliesRepo = repliesRepo;
        this.offersRepo = offersRepo;
        this.jobsRepo = jobsRepo;
        this.filter = filter;
    }
    async getQuestions(jobId) {
        const questions = await this.questionsRepo.find({
            where: { jobId },
            relations: ['user'],
            order: { createdAt: 'ASC' },
        });
        const results = await Promise.all(questions.map(async (q) => {
            const replies = await this.repliesRepo.find({
                where: { questionId: q.id },
                relations: ['user'],
                order: { createdAt: 'ASC' },
            });
            return {
                id: q.id,
                text: q.text,
                photoUrl: q.photoUrl,
                createdAt: q.createdAt,
                user: q.user
                    ? { id: q.user.id, fullName: q.user.fullName, profileImageUrl: q.user.profileImageUrl }
                    : null,
                replies: replies.map((r) => ({
                    id: r.id,
                    text: r.text,
                    createdAt: r.createdAt,
                    user: r.user
                        ? { id: r.user.id, fullName: r.user.fullName, profileImageUrl: r.user.profileImageUrl }
                        : null,
                })),
            };
        }));
        return results;
    }
    async postQuestion(jobId, userId, text, photoUrl) {
        const hasOffer = await this.offersRepo.findOne({ where: { jobId, userId } });
        if (!hasOffer) {
            throw new common_1.ForbiddenException('Soru sormak için önce bu ilana teklif vermeniz gerekiyor (5 token).');
        }
        const result = this.filter.check(text);
        const safeText = result.flagged ? this.filter.sanitize(text) : text;
        const q = this.questionsRepo.create({
            jobId,
            userId,
            text: safeText,
            photoUrl: photoUrl ?? null,
            flagged: result.flagged,
            flagReason: result.flagged ? result.reasons.join(',') : null,
        });
        return this.questionsRepo.save(q);
    }
    async postReply(questionId, userId, text) {
        const question = await this.questionsRepo.findOne({ where: { id: questionId } });
        if (!question)
            throw new common_1.NotFoundException('Soru bulunamadı.');
        const job = await this.jobsRepo.findOne({ where: { id: question.jobId } });
        const isJobOwner = job?.customerId === userId;
        const isQuestionOwner = question.userId === userId;
        if (!isJobOwner && !isQuestionOwner) {
            throw new common_1.ForbiddenException('Bu soruya yalnızca ilan sahibi veya soruyu soran yanıt verebilir.');
        }
        const reply = this.repliesRepo.create({ questionId, userId, text });
        return this.repliesRepo.save(reply);
    }
};
exports.QuestionsService = QuestionsService;
exports.QuestionsService = QuestionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_question_entity_1.JobQuestion)),
    __param(1, (0, typeorm_1.InjectRepository)(job_question_reply_entity_1.JobQuestionReply)),
    __param(2, (0, typeorm_1.InjectRepository)(offer_entity_1.Offer)),
    __param(3, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        content_filter_service_1.ContentFilterService])
], QuestionsService);
//# sourceMappingURL=questions.service.js.map