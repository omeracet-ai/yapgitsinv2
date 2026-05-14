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
var JobLeadsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobLeadsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_lead_entity_1 = require("./job-lead.entity");
const job_lead_response_entity_1 = require("./job-lead-response.entity");
const user_entity_1 = require("../users/user.entity");
const email_service_1 = require("../email/email.service");
const notifications_service_1 = require("../notifications/notifications.service");
const notification_entity_1 = require("../notifications/notification.entity");
let JobLeadsService = JobLeadsService_1 = class JobLeadsService {
    leadRepo;
    responseRepo;
    userRepo;
    emailService;
    notificationsService;
    logger = new common_1.Logger(JobLeadsService_1.name);
    constructor(leadRepo, responseRepo, userRepo, emailService, notificationsService) {
        this.leadRepo = leadRepo;
        this.responseRepo = responseRepo;
        this.userRepo = userRepo;
        this.emailService = emailService;
        this.notificationsService = notificationsService;
    }
    async create(dto, customerId) {
        if (dto.budgetMin && dto.budgetMax && dto.budgetMin > dto.budgetMax) {
            throw new common_1.BadRequestException('Minimum bütçe maksimumdan büyük olamaz');
        }
        const lead = this.leadRepo.create({
            category: dto.category.trim(),
            city: dto.city.trim(),
            description: dto.description?.trim() || null,
            budgetMin: dto.budgetMin || null,
            budgetMax: dto.budgetMax || null,
            budgetVisible: dto.budgetVisible || false,
            requesterName: dto.requesterName.trim(),
            requesterPhone: dto.requesterPhone.trim(),
            requesterEmail: dto.requesterEmail.trim(),
            preferredContactTime: dto.preferredContactTime || 'flexible',
            status: 'open',
            customerId: customerId || null,
            attachments: dto.attachments ? JSON.stringify(dto.attachments) : null,
        });
        const saved = await this.leadRepo.save(lead);
        this.logger.log(`[leads] created lead ${saved.id} for ${saved.category} in ${saved.city}`);
        this.matchAndNotifyWorkers(saved).catch((err) => {
            this.logger.error(`[leads] async matching failed for lead ${saved.id}: ${err.message}`);
        });
        return { id: saved.id, status: saved.status };
    }
    async findById(id, includeResponses = true) {
        const lead = await this.leadRepo.findOne({
            where: { id },
            relations: includeResponses ? ['responses', 'responses.worker'] : [],
        });
        if (!lead)
            throw new common_1.NotFoundException('İş isteği bulunamadı');
        return lead;
    }
    async findByCustomerId(customerId, page = 1, limit = 20) {
        const [data, total] = await this.leadRepo.findAndCount({
            where: { customerId },
            relations: ['responses'],
            order: { createdAt: 'DESC' },
            take: limit,
            skip: (page - 1) * limit,
        });
        return {
            data,
            total,
            pages: Math.ceil(total / limit) || 1,
        };
    }
    async updateStatus(id, status) {
        const lead = await this.findById(id, false);
        lead.status = status;
        return this.leadRepo.save(lead);
    }
    async matchWorkers(leadId) {
        const lead = await this.findById(leadId, false);
        if (!lead)
            throw new common_1.NotFoundException('Lead not found');
        const workers = await this.userRepo
            .createQueryBuilder('u')
            .where('u.workerCategories LIKE :category', { category: `%${lead.category}%` })
            .andWhere('(u.city = :city OR u.city IS NULL OR u.city = "")', { city: lead.city })
            .andWhere('u.identityVerified = true')
            .andWhere('u.isAvailable = true')
            .orderBy('u.averageRating', 'DESC')
            .addOrderBy('u.reputationScore', 'DESC')
            .limit(10)
            .getMany();
        this.logger.log(`[leads] matched ${workers.length} workers for lead ${leadId}`);
        return workers;
    }
    async recordResponse(leadId, workerId, status, message) {
        const lead = await this.leadRepo.findOne({ where: { id: leadId } });
        if (!lead)
            throw new common_1.NotFoundException('Lead not found');
        const worker = await this.userRepo.findOne({ where: { id: workerId } });
        if (!worker)
            throw new common_1.NotFoundException('Worker not found');
        let response = await this.responseRepo.findOne({
            where: { leadId, workerId },
        });
        if (!response) {
            response = this.responseRepo.create({
                leadId,
                workerId,
                status,
                workerMessage: message || null,
            });
        }
        else {
            response.status = status;
            if (message)
                response.workerMessage = message;
        }
        if (status === 'contacted' || status === 'accepted') {
            response.respondedAt = new Date();
        }
        return this.responseRepo.save(response);
    }
    async getLeadResponses(leadId) {
        return this.responseRepo.find({
            where: { leadId },
            relations: ['worker'],
            order: { createdAt: 'DESC' },
        });
    }
    async matchAndNotifyWorkers(lead) {
        try {
            const workers = await this.matchWorkers(lead.id);
            this.logger.log(`[leads] notifying ${workers.length} workers for lead ${lead.id}`);
            for (const worker of workers) {
                await this.emailService.sendJobLeadNotification({ id: worker.id, email: worker.email, fullName: worker.fullName }, {
                    id: lead.id,
                    category: lead.category,
                    city: lead.city,
                    description: lead.description || undefined,
                    budgetMin: lead.budgetMin || undefined,
                    budgetMax: lead.budgetMax || undefined,
                    requesterName: lead.requesterName,
                });
                void this.notificationsService.send({
                    userId: worker.id,
                    type: notification_entity_1.NotificationType.SAVED_SEARCH_MATCH,
                    title: `Yeni ${lead.category} isteği: ${lead.city}`,
                    body: lead.description
                        ? lead.description.substring(0, 100)
                        : `Bütçe: ${lead.budgetMin || 'yazılacak'} - ${lead.budgetMax || 'yazılacak'} TL`,
                    refId: lead.id,
                    relatedType: 'job',
                    relatedId: lead.id,
                });
                await this.responseRepo.save(this.responseRepo.create({
                    leadId: lead.id,
                    workerId: worker.id,
                    status: 'sent_email',
                }));
            }
            if (lead.requesterEmail) {
                await this.emailService.sendLeadConfirmation({
                    id: lead.customerId || undefined,
                    email: lead.requesterEmail,
                    fullName: lead.requesterName,
                }, {
                    category: lead.category,
                    city: lead.city,
                });
            }
            this.logger.log(`[leads] matching and notifications complete for lead ${lead.id}`);
        }
        catch (err) {
            this.logger.error(`[leads] error in matchAndNotifyWorkers: ${err.message}`);
        }
    }
};
exports.JobLeadsService = JobLeadsService;
exports.JobLeadsService = JobLeadsService = JobLeadsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_lead_entity_1.JobLead)),
    __param(1, (0, typeorm_1.InjectRepository)(job_lead_response_entity_1.JobLeadResponse)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        email_service_1.EmailService,
        notifications_service_1.NotificationsService])
], JobLeadsService);
//# sourceMappingURL=job-leads.service.js.map