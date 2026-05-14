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
exports.CancellationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const cancellation_policy_entity_1 = require("./cancellation-policy.entity");
let CancellationService = class CancellationService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async onModuleInit() {
        await this.seedDefaults();
    }
    async findApplicable(input) {
        const elapsed = Math.max(0, Math.floor(input.hoursElapsedSinceAccept || 0));
        const qb = this.repo
            .createQueryBuilder('p')
            .where('p.isActive = :active', { active: true })
            .andWhere('p.appliesTo = :appliesTo', { appliesTo: input.appliesTo })
            .andWhere('(p.appliesAtStage = :anyStage OR p.appliesAtStage = :stage)', {
            anyStage: cancellation_policy_entity_1.CancellationAppliesAtStage.ANY,
            stage: input.appliesAtStage,
        })
            .andWhere('p.minHoursElapsed <= :elapsed', { elapsed })
            .andWhere('(p.maxHoursElapsed IS NULL OR p.maxHoursElapsed >= :elapsed)', {
            elapsed,
        })
            .orderBy('p.priority', 'ASC')
            .limit(1);
        const result = await qb.getOne();
        return result || null;
    }
    calculateRefund(amount, policy) {
        const safeAmount = Number(amount) || 0;
        const refundAmount = Math.round(safeAmount * (policy.refundPercentage / 100) * 100) / 100;
        const taskerAmount = Math.round(safeAmount * (policy.taskerCompensationPercentage / 100) * 100) / 100;
        const platformFee = Math.round(safeAmount * (policy.platformFeePercentage / 100) * 100) / 100;
        return { refundAmount, taskerAmount, platformFee };
    }
    findAll() {
        return this.repo.find({
            order: { priority: 'ASC', createdAt: 'ASC' },
        });
    }
    async findById(id) {
        const found = await this.repo.findOne({ where: { id } });
        if (!found) {
            throw new common_1.NotFoundException(`CancellationPolicy ${id} not found`);
        }
        return found;
    }
    async create(dto) {
        const entity = this.repo.create({
            name: dto.name,
            appliesTo: dto.appliesTo,
            appliesAtStage: dto.appliesAtStage ??
                cancellation_policy_entity_1.CancellationAppliesAtStage.ANY,
            minHoursElapsed: dto.minHoursElapsed ?? 0,
            maxHoursElapsed: dto.maxHoursElapsed === undefined ? null : dto.maxHoursElapsed,
            refundPercentage: dto.refundPercentage,
            taskerCompensationPercentage: dto.taskerCompensationPercentage ?? 0,
            platformFeePercentage: dto.platformFeePercentage ?? 0,
            priority: dto.priority ?? 100,
            isActive: dto.isActive ?? true,
            description: dto.description ?? null,
        });
        return this.repo.save(entity);
    }
    async update(id, dto) {
        const existing = await this.findById(id);
        Object.assign(existing, {
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.appliesTo !== undefined
                ? { appliesTo: dto.appliesTo }
                : {}),
            ...(dto.appliesAtStage !== undefined
                ? { appliesAtStage: dto.appliesAtStage }
                : {}),
            ...(dto.minHoursElapsed !== undefined
                ? { minHoursElapsed: dto.minHoursElapsed }
                : {}),
            ...(dto.maxHoursElapsed !== undefined
                ? { maxHoursElapsed: dto.maxHoursElapsed }
                : {}),
            ...(dto.refundPercentage !== undefined
                ? { refundPercentage: dto.refundPercentage }
                : {}),
            ...(dto.taskerCompensationPercentage !== undefined
                ? {
                    taskerCompensationPercentage: dto.taskerCompensationPercentage,
                }
                : {}),
            ...(dto.platformFeePercentage !== undefined
                ? { platformFeePercentage: dto.platformFeePercentage }
                : {}),
            ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
            ...(dto.description !== undefined
                ? { description: dto.description }
                : {}),
        });
        return this.repo.save(existing);
    }
    async delete(id) {
        const existing = await this.findById(id);
        existing.isActive = false;
        return this.repo.save(existing);
    }
    async seedDefaults() {
        const count = await this.repo.count();
        if (count > 0)
            return;
        const defaults = [
            {
                name: 'Müşteri iptal — atama öncesi',
                appliesTo: cancellation_policy_entity_1.CancellationAppliesTo.CUSTOMER_CANCEL,
                appliesAtStage: cancellation_policy_entity_1.CancellationAppliesAtStage.BEFORE_ASSIGNMENT,
                minHoursElapsed: 0,
                maxHoursElapsed: null,
                refundPercentage: 100,
                taskerCompensationPercentage: 0,
                platformFeePercentage: 0,
                priority: 10,
                description: 'Henüz teklif kabul edilmediği için müşteri tam iade alır.',
            },
            {
                name: 'Müşteri iptal — atama sonrası 24 saat içinde',
                appliesTo: cancellation_policy_entity_1.CancellationAppliesTo.CUSTOMER_CANCEL,
                appliesAtStage: cancellation_policy_entity_1.CancellationAppliesAtStage.AFTER_ASSIGNMENT,
                minHoursElapsed: 0,
                maxHoursElapsed: 24,
                refundPercentage: 90,
                taskerCompensationPercentage: 0,
                platformFeePercentage: 10,
                priority: 20,
                description: 'Atama yapıldıktan sonraki ilk 24 saat içinde iptal: %90 iade, %10 platform ücreti.',
            },
            {
                name: 'Müşteri iptal — atama sonrası 24 saat geçmiş',
                appliesTo: cancellation_policy_entity_1.CancellationAppliesTo.CUSTOMER_CANCEL,
                appliesAtStage: cancellation_policy_entity_1.CancellationAppliesAtStage.AFTER_ASSIGNMENT,
                minHoursElapsed: 24,
                maxHoursElapsed: null,
                refundPercentage: 50,
                taskerCompensationPercentage: 50,
                platformFeePercentage: 0,
                priority: 30,
                description: 'Atamadan 24 saat sonrası iptal: %50 iade, %50 ustaya tazminat.',
            },
            {
                name: 'Müşteri iptal — iş başlamış',
                appliesTo: cancellation_policy_entity_1.CancellationAppliesTo.CUSTOMER_CANCEL,
                appliesAtStage: cancellation_policy_entity_1.CancellationAppliesAtStage.IN_PROGRESS,
                minHoursElapsed: 0,
                maxHoursElapsed: null,
                refundPercentage: 0,
                taskerCompensationPercentage: 100,
                platformFeePercentage: 0,
                priority: 40,
                description: 'İş başladıktan sonra müşteri iptal ederse usta tam ödeme alır.',
            },
            {
                name: 'Usta iptal — her zaman',
                appliesTo: cancellation_policy_entity_1.CancellationAppliesTo.TASKER_CANCEL,
                appliesAtStage: cancellation_policy_entity_1.CancellationAppliesAtStage.ANY,
                minHoursElapsed: 0,
                maxHoursElapsed: null,
                refundPercentage: 100,
                taskerCompensationPercentage: 0,
                platformFeePercentage: 0,
                priority: 50,
                description: 'Usta iptal ettiğinde müşteri her durumda tam iade alır.',
            },
            {
                name: 'Karşılıklı iptal',
                appliesTo: cancellation_policy_entity_1.CancellationAppliesTo.MUTUAL_CANCEL,
                appliesAtStage: cancellation_policy_entity_1.CancellationAppliesAtStage.ANY,
                minHoursElapsed: 0,
                maxHoursElapsed: null,
                refundPercentage: 100,
                taskerCompensationPercentage: 0,
                platformFeePercentage: 0,
                priority: 60,
                description: 'İki taraf anlaşarak iptal ederse müşteri tam iade alır.',
            },
        ];
        for (const dto of defaults) {
            await this.create(dto);
        }
    }
};
exports.CancellationService = CancellationService;
exports.CancellationService = CancellationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(cancellation_policy_entity_1.CancellationPolicy)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CancellationService);
//# sourceMappingURL=cancellation.service.js.map