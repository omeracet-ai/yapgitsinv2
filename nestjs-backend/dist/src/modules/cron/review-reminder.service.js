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
var ReviewReminderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewReminderService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("../jobs/job.entity");
const offer_entity_1 = require("../jobs/offer.entity");
const review_entity_1 = require("../reviews/review.entity");
const notification_entity_1 = require("../notifications/notification.entity");
let ReviewReminderService = ReviewReminderService_1 = class ReviewReminderService {
    jobRepo;
    offerRepo;
    reviewRepo;
    notifRepo;
    logger = new common_1.Logger(ReviewReminderService_1.name);
    constructor(jobRepo, offerRepo, reviewRepo, notifRepo) {
        this.jobRepo = jobRepo;
        this.offerRepo = offerRepo;
        this.reviewRepo = reviewRepo;
        this.notifRepo = notifRepo;
    }
    async sendReminders() {
        const now = Date.now();
        const min = new Date(now - 72 * 60 * 60 * 1000);
        const max = new Date(now - 24 * 60 * 60 * 1000);
        const jobs = await this.jobRepo.find({
            where: { status: job_entity_1.JobStatus.COMPLETED, updatedAt: (0, typeorm_2.Between)(min, max) },
        });
        let sent = 0;
        for (const job of jobs) {
            const accepted = await this.offerRepo.findOne({
                where: { jobId: job.id, status: offer_entity_1.OfferStatus.ACCEPTED },
                relations: ['user'],
            });
            const workerId = accepted?.userId;
            if (!workerId)
                continue;
            const customer = await this.jobRepo.manager.findOne(job_entity_1.Job, {
                where: { id: job.id },
                relations: ['customer'],
            });
            const customerName = customer?.customer?.fullName ?? 'Müşteri';
            const workerName = accepted?.user?.fullName ?? 'Usta';
            const parties = [
                { userId: job.customerId, counterpartName: workerName },
                { userId: workerId, counterpartName: customerName },
            ];
            for (const p of parties) {
                const existingReview = await this.reviewRepo.findOne({
                    where: { jobId: job.id, reviewerId: p.userId },
                });
                if (existingReview)
                    continue;
                const existingNotif = await this.notifRepo.findOne({
                    where: {
                        userId: p.userId,
                        type: notification_entity_1.NotificationType.REVIEW_REMINDER,
                        refId: job.id,
                    },
                });
                if (existingNotif)
                    continue;
                await this.notifRepo.save(this.notifRepo.create({
                    userId: p.userId,
                    type: notification_entity_1.NotificationType.REVIEW_REMINDER,
                    title: 'Yorum Yapmayı Unutma',
                    body: `${p.counterpartName} ile yaptığın iş için yorum bırakırsan diğer kullanıcılara yardımcı olursun.`,
                    refId: job.id,
                }));
                sent++;
            }
        }
        this.logger.log(`[ReviewReminder] checked ${jobs.length} jobs, sent ${sent} reminders`);
    }
};
exports.ReviewReminderService = ReviewReminderService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReviewReminderService.prototype, "sendReminders", null);
exports.ReviewReminderService = ReviewReminderService = ReviewReminderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(1, (0, typeorm_1.InjectRepository)(offer_entity_1.Offer)),
    __param(2, (0, typeorm_1.InjectRepository)(review_entity_1.Review)),
    __param(3, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ReviewReminderService);
//# sourceMappingURL=review-reminder.service.js.map