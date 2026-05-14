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
var SavedSearchAlertService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SavedSearchAlertService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("../jobs/job.entity");
const notification_entity_1 = require("../notifications/notification.entity");
const saved_job_search_entity_1 = require("../favorites/saved-job-search.entity");
let SavedSearchAlertService = SavedSearchAlertService_1 = class SavedSearchAlertService {
    searchRepo;
    jobRepo;
    notifRepo;
    logger = new common_1.Logger(SavedSearchAlertService_1.name);
    constructor(searchRepo, jobRepo, notifRepo) {
        this.searchRepo = searchRepo;
        this.jobRepo = jobRepo;
        this.notifRepo = notifRepo;
    }
    async runAlerts() {
        const now = new Date();
        const searches = await this.searchRepo.find();
        let totalMatches = 0;
        let totalNotified = 0;
        for (const search of searches) {
            const since = search.lastNotifiedAt ?? new Date(now.getTime() - 60 * 60 * 1000);
            const c = search.criteria || {};
            const qb = this.jobRepo.createQueryBuilder('job')
                .where('job.createdAt > :since', { since })
                .andWhere('job.status = :status', { status: job_entity_1.JobStatus.OPEN })
                .andWhere('job.customerId != :uid', { uid: search.userId });
            if (c.category) {
                qb.andWhere('job.category = :cat', { cat: c.category });
            }
            if (c.city) {
                qb.andWhere('LOWER(job.location) LIKE :city', { city: `%${c.city.toLowerCase()}%` });
            }
            if (typeof c.budgetMin === 'number') {
                qb.andWhere('(job.budgetMax >= :bMin OR job.budgetMax IS NULL)', { bMin: c.budgetMin });
            }
            if (typeof c.budgetMax === 'number') {
                qb.andWhere('(job.budgetMin <= :bMax OR job.budgetMin IS NULL)', { bMax: c.budgetMax });
            }
            const matches = await qb.orderBy('job.createdAt', 'DESC').limit(10).getMany();
            totalMatches += matches.length;
            for (const job of matches) {
                await this.notifRepo.save(this.notifRepo.create({
                    userId: search.userId,
                    type: notification_entity_1.NotificationType.SAVED_SEARCH_MATCH,
                    title: 'Aramana Uyan Yeni İlan',
                    body: `"${search.name}" aramana uyan yeni bir ilan: ${job.title}`,
                    refId: job.id,
                }));
                totalNotified++;
            }
            search.lastNotifiedAt = now;
            await this.searchRepo.save(search);
        }
        this.logger.log(`[SavedSearchAlert] checked ${searches.length} searches, found ${totalMatches} matches, notified ${totalNotified}`);
    }
};
exports.SavedSearchAlertService = SavedSearchAlertService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SavedSearchAlertService.prototype, "runAlerts", null);
exports.SavedSearchAlertService = SavedSearchAlertService = SavedSearchAlertService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(saved_job_search_entity_1.SavedJobSearch)),
    __param(1, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(2, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], SavedSearchAlertService);
//# sourceMappingURL=saved-search-alert.service.js.map