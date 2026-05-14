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
var DisputesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_dispute_entity_1 = require("./job-dispute.entity");
const escrow_service_1 = require("../escrow/escrow.service");
let DisputesService = DisputesService_1 = class DisputesService {
    repo;
    escrowService;
    logger = new common_1.Logger(DisputesService_1.name);
    constructor(repo, escrowService) {
        this.repo = repo;
        this.escrowService = escrowService;
    }
    async create(dto) {
        const entity = this.repo.create({
            jobId: dto.jobId,
            raisedByUserId: dto.raisedByUserId,
            counterPartyUserId: dto.counterPartyUserId,
            escrowId: dto.escrowId ?? null,
            disputeType: dto.disputeType,
            reason: dto.reason,
            evidenceUrls: dto.evidenceUrls ?? null,
            resolutionStatus: job_dispute_entity_1.DisputeResolutionStatus.OPEN,
        });
        return this.repo.save(entity);
    }
    findOpenDisputes() {
        return this.repo.find({
            where: {
                resolutionStatus: (0, typeorm_2.In)([
                    job_dispute_entity_1.DisputeResolutionStatus.OPEN,
                    job_dispute_entity_1.DisputeResolutionStatus.UNDER_REVIEW,
                ]),
            },
            order: { raisedAt: 'DESC' },
        });
    }
    async findById(id, requesterId, isAdmin) {
        const d = await this.repo.findOne({ where: { id } });
        if (!d)
            throw new common_1.NotFoundException('Dispute not found');
        if (!isAdmin &&
            d.raisedByUserId !== requesterId &&
            d.counterPartyUserId !== requesterId) {
            throw new common_1.ForbiddenException('Not a party to this dispute');
        }
        return d;
    }
    findByJob(jobId) {
        return this.repo.find({
            where: { jobId },
            order: { raisedAt: 'DESC' },
        });
    }
    findMine(userId) {
        return this.repo.find({
            where: [{ raisedByUserId: userId }, { counterPartyUserId: userId }],
            order: { raisedAt: 'DESC' },
        });
    }
    async markUnderReview(id, adminId) {
        const d = await this.repo.findOne({ where: { id } });
        if (!d)
            throw new common_1.NotFoundException('Dispute not found');
        if (d.resolutionStatus !== job_dispute_entity_1.DisputeResolutionStatus.OPEN) {
            throw new common_1.ForbiddenException('Dispute is not open');
        }
        d.resolutionStatus = job_dispute_entity_1.DisputeResolutionStatus.UNDER_REVIEW;
        d.resolvedByAdminId = adminId;
        return this.repo.save(d);
    }
    async resolve(id, adminId, dto) {
        const d = await this.repo.findOne({ where: { id } });
        if (!d)
            throw new common_1.NotFoundException('Dispute not found');
        if (d.resolutionStatus === job_dispute_entity_1.DisputeResolutionStatus.DISMISSED ||
            d.resolutionStatus === job_dispute_entity_1.DisputeResolutionStatus.RESOLVED_CUSTOMER ||
            d.resolutionStatus === job_dispute_entity_1.DisputeResolutionStatus.RESOLVED_TASKER ||
            d.resolutionStatus === job_dispute_entity_1.DisputeResolutionStatus.RESOLVED_SPLIT) {
            throw new common_1.ForbiddenException('Dispute already finalized');
        }
        d.resolutionStatus = dto.status;
        d.resolutionNotes = dto.notes;
        d.resolvedByAdminId = adminId;
        d.refundAmount = dto.refundAmount ?? null;
        d.taskerCompensationAmount = dto.taskerCompensationAmount ?? null;
        d.resolvedAt = new Date();
        return this.repo.save(d);
    }
    async dismiss(id, adminId, notes) {
        const d = await this.repo.findOne({ where: { id } });
        if (!d)
            throw new common_1.NotFoundException('Dispute not found');
        d.resolutionStatus = job_dispute_entity_1.DisputeResolutionStatus.DISMISSED;
        d.resolutionNotes = notes;
        d.resolvedByAdminId = adminId;
        d.resolvedAt = new Date();
        return this.repo.save(d);
    }
    async applyResolution(disputeId, adminId, decision) {
        const d = await this.repo.findOne({ where: { id: disputeId } });
        if (!d)
            throw new common_1.NotFoundException('Dispute not found');
        if (!d.escrowId)
            return;
        try {
            if (decision.status === job_dispute_entity_1.DisputeResolutionStatus.RESOLVED_CUSTOMER) {
                const escrow = await this.escrowService.getById(d.escrowId, adminId, 'admin');
                await this.escrowService.refund(d.escrowId, adminId, escrow.amount, 'Uyuşmazlık müşteri lehine çözüldü', 'admin');
            }
            else if (decision.status === job_dispute_entity_1.DisputeResolutionStatus.RESOLVED_TASKER) {
                await this.escrowService.release(d.escrowId, adminId, 'Uyuşmazlık usta lehine çözüldü', 'admin');
            }
            else if (decision.status === job_dispute_entity_1.DisputeResolutionStatus.RESOLVED_SPLIT) {
                if (decision.refundAmount === undefined ||
                    decision.refundAmount === null) {
                    throw new common_1.ForbiddenException('refundAmount is required for split resolution');
                }
                await this.escrowService.refund(d.escrowId, adminId, decision.refundAmount, 'Kısmi çözüm', 'admin');
            }
        }
        catch (err) {
            this.logger.warn(`applyResolution escrow side-effect failed for dispute ${disputeId}: ${err?.message ?? err}`);
        }
    }
};
exports.DisputesService = DisputesService;
exports.DisputesService = DisputesService = DisputesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_dispute_entity_1.JobDispute)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        escrow_service_1.EscrowService])
], DisputesService);
//# sourceMappingURL=disputes.service.js.map