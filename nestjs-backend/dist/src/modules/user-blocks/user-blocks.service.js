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
exports.UserBlocksService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_block_entity_1 = require("./user-block.entity");
const user_report_entity_1 = require("./user-report.entity");
const user_entity_1 = require("../users/user.entity");
let UserBlocksService = class UserBlocksService {
    blocksRepo;
    reportsRepo;
    usersRepo;
    constructor(blocksRepo, reportsRepo, usersRepo) {
        this.blocksRepo = blocksRepo;
        this.reportsRepo = reportsRepo;
        this.usersRepo = usersRepo;
    }
    async block(blockerId, blockedUserId) {
        if (blockerId === blockedUserId) {
            throw new common_1.BadRequestException('Kendinizi bloklayamazsınız');
        }
        const existing = await this.blocksRepo.findOne({
            where: { blockerUserId: blockerId, blockedUserId },
        });
        if (existing)
            return existing;
        const row = this.blocksRepo.create({
            blockerUserId: blockerId,
            blockedUserId,
        });
        return this.blocksRepo.save(row);
    }
    async unblock(blockerId, blockedUserId) {
        const existing = await this.blocksRepo.findOne({
            where: { blockerUserId: blockerId, blockedUserId },
        });
        if (!existing)
            throw new common_1.NotFoundException('Block kaydı bulunamadı');
        await this.blocksRepo.remove(existing);
        return { ok: true };
    }
    async unblockIdempotent(blockerId, blockedUserId) {
        const existing = await this.blocksRepo.findOne({
            where: { blockerUserId: blockerId, blockedUserId },
        });
        if (existing)
            await this.blocksRepo.remove(existing);
        return { blocked: false, blockedId: blockedUserId };
    }
    async listBlockedPaged(blockerId) {
        const rows = await this.blocksRepo.find({
            where: { blockerUserId: blockerId },
            order: { createdAt: 'DESC' },
        });
        if (rows.length === 0)
            return { data: [], total: 0 };
        const ids = rows.map((r) => r.blockedUserId);
        const users = await this.usersRepo.find({ where: { id: (0, typeorm_2.In)(ids) } });
        const map = new Map(users.map((u) => [u.id, u]));
        const data = rows.map((r) => {
            const u = map.get(r.blockedUserId);
            return {
                id: r.id,
                blockedId: r.blockedUserId,
                blockedUser: u
                    ? {
                        id: u.id,
                        fullName: u.fullName,
                        profileImageUrl: u.profileImageUrl ?? null,
                    }
                    : null,
                createdAt: r.createdAt,
            };
        });
        return { data, total: data.length };
    }
    async isBlocked(blockerId, blockedUserId) {
        const c = await this.blocksRepo.count({
            where: { blockerUserId: blockerId, blockedUserId },
        });
        return c > 0;
    }
    async isEitherBlocked(userA, userB) {
        const c = await this.blocksRepo.count({
            where: [
                { blockerUserId: userA, blockedUserId: userB },
                { blockerUserId: userB, blockedUserId: userA },
            ],
        });
        return c > 0;
    }
    async listBlocked(blockerId) {
        const rows = await this.blocksRepo.find({
            where: { blockerUserId: blockerId },
            order: { createdAt: 'DESC' },
        });
        if (rows.length === 0)
            return [];
        const ids = rows.map((r) => r.blockedUserId);
        const users = await this.usersRepo.find({ where: { id: (0, typeorm_2.In)(ids) } });
        const map = new Map(users.map((u) => [u.id, u]));
        return rows.map((r) => {
            const u = map.get(r.blockedUserId);
            return {
                id: r.id,
                blockedUserId: r.blockedUserId,
                createdAt: r.createdAt,
                fullName: u?.fullName ?? null,
                profileImageUrl: u?.profileImageUrl ?? null,
            };
        });
    }
    async listBlockedIds(blockerId) {
        const rows = await this.blocksRepo.find({
            where: { blockerUserId: blockerId },
            select: ['blockedUserId'],
        });
        return rows.map((r) => r.blockedUserId);
    }
    async report(reporterId, reportedUserId, reason, description) {
        if (reporterId === reportedUserId) {
            throw new common_1.BadRequestException('Kendinizi bildiremezsiniz');
        }
        const dup = await this.reportsRepo.findOne({
            where: {
                reporterUserId: reporterId,
                reportedUserId,
                status: 'pending',
            },
        });
        if (dup) {
            throw new common_1.ConflictException('Bu kullanıcı için bekleyen şikayetiniz var');
        }
        const row = this.reportsRepo.create({
            reporterUserId: reporterId,
            reportedUserId,
            reason,
            description: description ?? null,
            status: 'pending',
        });
        return this.reportsRepo.save(row);
    }
    async findReports(status) {
        return this.reportsRepo.find({
            where: status ? { status } : {},
            order: { createdAt: 'DESC' },
            take: 100,
        });
    }
    async findReportsPaged(status, page = 1, limit = 20) {
        const safePage = Math.max(1, page);
        const safeLimit = Math.min(100, Math.max(1, limit));
        const [data, total] = await this.reportsRepo.findAndCount({
            where: status ? { status } : {},
            order: { createdAt: 'DESC' },
            skip: (safePage - 1) * safeLimit,
            take: safeLimit,
        });
        return {
            data,
            total,
            page: safePage,
            limit: safeLimit,
            pages: Math.ceil(total / safeLimit) || 1,
        };
    }
    async updateReportStatus(reportId, status, adminNote) {
        const r = await this.reportsRepo.findOne({ where: { id: reportId } });
        if (!r)
            throw new common_1.NotFoundException('Rapor bulunamadı');
        r.status = status;
        if (adminNote !== undefined)
            r.adminNote = adminNote;
        return this.reportsRepo.save(r);
    }
};
exports.UserBlocksService = UserBlocksService;
exports.UserBlocksService = UserBlocksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_block_entity_1.UserBlock)),
    __param(1, (0, typeorm_1.InjectRepository)(user_report_entity_1.UserReport)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], UserBlocksService);
//# sourceMappingURL=user-blocks.service.js.map