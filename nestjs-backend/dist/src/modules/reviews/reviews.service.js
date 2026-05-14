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
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const review_entity_1 = require("./review.entity");
const review_helpful_entity_1 = require("./review-helpful.entity");
const users_service_1 = require("../users/users.service");
const fraud_detection_service_1 = require("../ai/fraud-detection.service");
const branded_1 = require("../../common/types/branded");
let ReviewsService = class ReviewsService {
    reviewsRepository;
    helpfulRepository;
    usersService;
    fraudDetection;
    constructor(reviewsRepository, helpfulRepository, usersService, fraudDetection) {
        this.reviewsRepository = reviewsRepository;
        this.helpfulRepository = helpfulRepository;
        this.usersService = usersService;
        this.fraudDetection = fraudDetection;
    }
    async create(data) {
        const review = this.reviewsRepository.create(data);
        const saved = await this.reviewsRepository.save(review);
        if (saved.revieweeId && typeof saved.rating === 'number') {
            await this.usersService.recalcRating((0, branded_1.asUserId)(saved.revieweeId), saved.rating);
        }
        if (saved.comment && saved.comment.trim().length > 0) {
            this.fraudDetection
                .analyzeReview(saved.comment)
                .then(async (r) => {
                if (r.score >= 70) {
                    await this.reviewsRepository.update(saved.id, {
                        flagged: true,
                        flagReason: r.reasons.join('; '),
                        fraudScore: r.score,
                    });
                }
                else {
                    await this.reviewsRepository.update(saved.id, { fraudScore: r.score });
                }
            })
                .catch(() => undefined);
        }
        return saved;
    }
    async findByReviewee(revieweeId) {
        return this.reviewsRepository.find({
            where: { revieweeId },
            relations: ['reviewer'],
            order: { createdAt: 'DESC' },
        });
    }
    async findByJob(jobId) {
        return this.reviewsRepository.find({
            where: { jobId },
            relations: ['reviewer', 'reviewee'],
            order: { createdAt: 'DESC' },
        });
    }
    async addPhotos(reviewId, userId, photoUrls) {
        const review = await this.reviewsRepository.findOne({ where: { id: reviewId } });
        if (!review)
            throw new common_1.NotFoundException('Review bulunamadı');
        if (review.reviewerId !== userId)
            throw new common_1.ForbiddenException('Sadece review sahibi fotoğraf ekleyebilir');
        const existing = review.photos || [];
        const merged = [...existing, ...photoUrls].slice(0, 3);
        if (merged.length > 3)
            throw new common_1.BadRequestException('Maksimum 3 fotoğraf eklenebilir');
        review.photos = merged;
        return this.reviewsRepository.save(review);
    }
    async markHelpful(reviewId, userId) {
        const review = await this.reviewsRepository.findOne({ where: { id: reviewId } });
        if (!review)
            throw new common_1.NotFoundException('Review bulunamadı');
        if (review.reviewerId === userId)
            throw new common_1.ForbiddenException('Kendi yorumunuza faydalı oy veremezsiniz');
        const existing = await this.helpfulRepository.findOne({ where: { reviewId, userId } });
        if (existing)
            throw new common_1.ConflictException('Bu yorumu zaten faydalı buldunuz');
        await this.helpfulRepository.save(this.helpfulRepository.create({ reviewId, userId }));
        const newCount = (review.helpfulCount || 0) + 1;
        await this.reviewsRepository.update(reviewId, { helpfulCount: newCount });
        return { helpfulCount: newCount };
    }
    async addOrUpdateReply(reviewId, userId, text) {
        const review = await this.reviewsRepository.findOne({ where: { id: reviewId } });
        if (!review) {
            throw new common_1.NotFoundException('Review bulunamadı');
        }
        if (review.revieweeId !== userId) {
            throw new common_1.ForbiddenException('Bu yoruma sadece değerlendirilen kişi cevap verebilir');
        }
        review.replyText = text;
        review.repliedAt = new Date();
        const saved = await this.reviewsRepository.save(review);
        return { id: saved.id, replyText: saved.replyText, repliedAt: saved.repliedAt };
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(review_entity_1.Review)),
    __param(1, (0, typeorm_1.InjectRepository)(review_helpful_entity_1.ReviewHelpful)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        users_service_1.UsersService,
        fraud_detection_service_1.FraudDetectionService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map