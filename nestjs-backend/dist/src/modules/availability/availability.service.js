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
exports.AvailabilityService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const availability_slot_entity_1 = require("./availability-slot.entity");
const availability_blackout_entity_1 = require("./availability-blackout.entity");
function pad2(n) {
    return n < 10 ? `0${n}` : `${n}`;
}
function dateToYMD(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function dateToHM(d) {
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function validateHM(s) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) {
        throw new common_1.BadRequestException(`Invalid time format: ${s} (expected HH:MM)`);
    }
}
let AvailabilityService = class AvailabilityService {
    slotRepo;
    blackoutRepo;
    constructor(slotRepo, blackoutRepo) {
        this.slotRepo = slotRepo;
        this.blackoutRepo = blackoutRepo;
    }
    async getSlots(userId) {
        return this.slotRepo.find({
            where: { userId, isActive: true },
            order: { dayOfWeek: 'ASC', startTime: 'ASC' },
        });
    }
    async addSlot(userId, dto) {
        if (dto.dayOfWeek < 0 || dto.dayOfWeek > 6) {
            throw new common_1.BadRequestException('dayOfWeek must be 0-6');
        }
        validateHM(dto.startTime);
        validateHM(dto.endTime);
        if (dto.startTime >= dto.endTime) {
            throw new common_1.BadRequestException('startTime must be before endTime');
        }
        const slot = this.slotRepo.create({
            userId,
            dayOfWeek: dto.dayOfWeek,
            startTime: dto.startTime,
            endTime: dto.endTime,
            isRecurring: true,
            recurringUntil: dto.recurringUntil ?? null,
            isActive: true,
        });
        return this.slotRepo.save(slot);
    }
    async updateSlot(slotId, userId, partial) {
        const slot = await this.slotRepo.findOne({ where: { id: slotId } });
        if (!slot)
            throw new common_1.NotFoundException('Slot not found');
        if (slot.userId !== userId)
            throw new common_1.ForbiddenException('Not your slot');
        if (partial.dayOfWeek !== undefined) {
            if (partial.dayOfWeek < 0 || partial.dayOfWeek > 6) {
                throw new common_1.BadRequestException('dayOfWeek must be 0-6');
            }
            slot.dayOfWeek = partial.dayOfWeek;
        }
        if (partial.startTime !== undefined) {
            validateHM(partial.startTime);
            slot.startTime = partial.startTime;
        }
        if (partial.endTime !== undefined) {
            validateHM(partial.endTime);
            slot.endTime = partial.endTime;
        }
        if (slot.startTime >= slot.endTime) {
            throw new common_1.BadRequestException('startTime must be before endTime');
        }
        if (partial.recurringUntil !== undefined) {
            slot.recurringUntil = partial.recurringUntil;
        }
        if (partial.isActive !== undefined) {
            slot.isActive = partial.isActive;
        }
        return this.slotRepo.save(slot);
    }
    async removeSlot(slotId, userId) {
        const slot = await this.slotRepo.findOne({ where: { id: slotId } });
        if (!slot)
            throw new common_1.NotFoundException('Slot not found');
        if (slot.userId !== userId)
            throw new common_1.ForbiddenException('Not your slot');
        await this.slotRepo.delete(slotId);
        return { deleted: true };
    }
    async getBlackouts(userId) {
        const today = dateToYMD(new Date());
        return this.blackoutRepo.find({
            where: { userId, endDate: (0, typeorm_2.MoreThanOrEqual)(today) },
            order: { startDate: 'ASC' },
        });
    }
    async addBlackout(userId, dto) {
        if (!dto.startDate || !dto.endDate) {
            throw new common_1.BadRequestException('startDate and endDate required');
        }
        if (dto.startDate > dto.endDate) {
            throw new common_1.BadRequestException('startDate must be <= endDate');
        }
        const b = this.blackoutRepo.create({
            userId,
            startDate: dto.startDate,
            endDate: dto.endDate,
            reason: dto.reason ?? null,
        });
        return this.blackoutRepo.save(b);
    }
    async removeBlackout(blackoutId, userId) {
        const b = await this.blackoutRepo.findOne({ where: { id: blackoutId } });
        if (!b)
            throw new common_1.NotFoundException('Blackout not found');
        if (b.userId !== userId)
            throw new common_1.ForbiddenException('Not your blackout');
        await this.blackoutRepo.delete(blackoutId);
        return { deleted: true };
    }
    async isAvailable(userId, dateTime) {
        if (isNaN(dateTime.getTime()))
            return false;
        const ymd = dateToYMD(dateTime);
        const hm = dateToHM(dateTime);
        const dow = dateTime.getDay();
        const blackout = await this.blackoutRepo.findOne({
            where: {
                userId,
                startDate: (0, typeorm_2.LessThanOrEqual)(ymd),
                endDate: (0, typeorm_2.MoreThanOrEqual)(ymd),
            },
        });
        if (blackout)
            return false;
        const slots = await this.slotRepo.find({
            where: { userId, dayOfWeek: dow, isActive: true },
        });
        for (const s of slots) {
            if (s.recurringUntil && s.recurringUntil < ymd)
                continue;
            if (s.startTime <= hm && hm < s.endTime)
                return true;
        }
        return false;
    }
    async findAvailableTaskers(dateTime, _category, _city) {
        if (isNaN(dateTime.getTime()))
            return [];
        const ymd = dateToYMD(dateTime);
        const hm = dateToHM(dateTime);
        const dow = dateTime.getDay();
        const slots = await this.slotRepo
            .createQueryBuilder('s')
            .where('s.dayOfWeek = :dow', { dow })
            .andWhere('s.isActive = :active', { active: true })
            .andWhere('s.startTime <= :hm', { hm })
            .andWhere('s.endTime > :hm', { hm })
            .andWhere('(s.recurringUntil IS NULL OR s.recurringUntil >= :ymd)', {
            ymd,
        })
            .getMany();
        const userIds = Array.from(new Set(slots.map((s) => s.userId)));
        if (userIds.length === 0)
            return [];
        const blackouts = await this.blackoutRepo.find({
            where: {
                userId: (0, typeorm_2.In)(userIds),
                startDate: (0, typeorm_2.LessThanOrEqual)(ymd),
                endDate: (0, typeorm_2.MoreThanOrEqual)(ymd),
            },
        });
        const blackedOut = new Set(blackouts.map((b) => b.userId));
        return userIds.filter((u) => !blackedOut.has(u));
    }
    async getCalendar(userId) {
        const [slots, blackouts] = await Promise.all([
            this.getSlots(userId),
            this.getBlackouts(userId),
        ]);
        return { slots, blackouts };
    }
};
exports.AvailabilityService = AvailabilityService;
exports.AvailabilityService = AvailabilityService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(availability_slot_entity_1.AvailabilitySlot)),
    __param(1, (0, typeorm_1.InjectRepository)(availability_blackout_entity_1.AvailabilityBlackout)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], AvailabilityService);
//# sourceMappingURL=availability.service.js.map