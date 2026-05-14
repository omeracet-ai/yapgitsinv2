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
exports.GeneralDisputesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const dispute_entity_1 = require("./dispute.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const notification_entity_1 = require("../notifications/notification.entity");
const user_entity_1 = require("../users/user.entity");
const dispute_mediation_service_1 = require("../ai/dispute-mediation.service");
let GeneralDisputesService = class GeneralDisputesService {
    repo;
    userRepo;
    notifications;
    mediation;
    constructor(repo, userRepo, notifications, mediation) {
        this.repo = repo;
        this.userRepo = userRepo;
        this.notifications = notifications;
        this.mediation = mediation;
    }
    async create(raisedBy, dto) {
        if (!dto.againstUserId || !dto.type || !dto.description?.trim()) {
            throw new common_1.BadRequestException('againstUserId, type, description gerekli');
        }
        if (dto.againstUserId === raisedBy) {
            throw new common_1.BadRequestException('Kendinize karşı şikayet açamazsınız');
        }
        const entity = this.repo.create({
            jobId: dto.jobId ?? null,
            bookingId: dto.bookingId ?? null,
            raisedBy,
            againstUserId: dto.againstUserId,
            type: dto.type,
            description: dto.description.trim(),
            status: dispute_entity_1.GeneralDisputeStatus.OPEN,
        });
        const saved = await this.repo.save(entity);
        const admins = await this.userRepo.find({ where: { role: user_entity_1.UserRole.ADMIN } });
        for (const a of admins) {
            await this.notifications.send({
                userId: a.id,
                type: notification_entity_1.NotificationType.DISPUTE_OPENED,
                title: 'Yeni şikayet açıldı',
                body: `Yeni bir ${dto.type} tipinde anlaşmazlık açıldı.`,
                refId: saved.id,
            });
        }
        void this.mediation
            .analyzeDispute({
            type: dto.type,
            description: dto.description,
            againstUserId: dto.againstUserId,
            jobId: dto.jobId ?? null,
            bookingId: dto.bookingId ?? null,
        })
            .then(async (analysis) => {
            if (analysis) {
                saved.aiAnalysis = analysis;
                await this.repo.save(saved);
            }
        })
            .catch(() => {
        });
        return saved;
    }
    findMine(userId) {
        return this.repo.find({
            where: [{ raisedBy: userId }, { againstUserId: userId }],
            order: { createdAt: 'DESC' },
        });
    }
    async findForAdmin(status, page = 1, limit = 20) {
        const qb = this.repo.createQueryBuilder('d').orderBy('d.createdAt', 'DESC');
        if (status)
            qb.andWhere('d.status = :status', { status });
        qb.skip((page - 1) * limit).take(limit);
        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit, pages: Math.ceil(total / limit) || 1 };
    }
    async resolve(id, adminId, dto) {
        const d = await this.repo.findOne({ where: { id } });
        if (!d)
            throw new common_1.NotFoundException('Şikayet bulunamadı');
        if (d.status === dispute_entity_1.GeneralDisputeStatus.RESOLVED ||
            d.status === dispute_entity_1.GeneralDisputeStatus.DISMISSED) {
            throw new common_1.ForbiddenException('Şikayet zaten kapatılmış');
        }
        if (dto.status !== dispute_entity_1.GeneralDisputeStatus.RESOLVED &&
            dto.status !== dispute_entity_1.GeneralDisputeStatus.DISMISSED) {
            throw new common_1.BadRequestException('status sadece resolved veya dismissed olabilir');
        }
        d.status = dto.status;
        d.resolution = dto.resolution;
        d.resolvedAt = new Date();
        d.resolvedBy = adminId;
        const saved = await this.repo.save(d);
        const title = dto.status === dispute_entity_1.GeneralDisputeStatus.RESOLVED
            ? 'Şikayetiniz çözüldü'
            : 'Şikayetiniz reddedildi';
        for (const uid of [d.raisedBy, d.againstUserId]) {
            await this.notifications.send({
                userId: uid,
                type: notification_entity_1.NotificationType.DISPUTE_RESOLVED,
                title,
                body: dto.resolution,
                refId: saved.id,
            });
        }
        return saved;
    }
};
exports.GeneralDisputesService = GeneralDisputesService;
exports.GeneralDisputesService = GeneralDisputesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(dispute_entity_1.Dispute)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService,
        dispute_mediation_service_1.DisputeMediationService])
], GeneralDisputesService);
//# sourceMappingURL=general-disputes.service.js.map