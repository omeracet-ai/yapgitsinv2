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
var AdminAuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuditService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const admin_audit_log_entity_1 = require("./admin-audit-log.entity");
const user_entity_1 = require("../users/user.entity");
let AdminAuditService = AdminAuditService_1 = class AdminAuditService {
    repo;
    userRepo;
    logger = new common_1.Logger(AdminAuditService_1.name);
    constructor(repo, userRepo) {
        this.repo = repo;
        this.userRepo = userRepo;
    }
    async logAction(adminUserId, action, targetType, targetId, payload) {
        try {
            const entity = this.repo.create({
                adminUserId,
                action,
                targetType: targetType ?? null,
                targetId: targetId ?? null,
                payload: payload ?? null,
            });
            await this.repo.save(entity);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            this.logger.warn(`[audit] failed: ${msg}`);
        }
    }
    async record(opts) {
        try {
            let actorEmail = opts.actor?.email ?? null;
            if (opts.actor?.id && !actorEmail) {
                const u = await this.userRepo.findOne({
                    where: { id: opts.actor.id },
                    select: ['id', 'email'],
                });
                actorEmail = u?.email ?? null;
            }
            const ua = opts.req?.headers?.['user-agent'];
            const fwd = opts.req?.headers?.['x-forwarded-for'];
            const ip = (typeof fwd === 'string' ? fwd.split(',')[0].trim() : null) ||
                opts.req?.ip ||
                null;
            const entity = this.repo.create({
                adminUserId: opts.actor?.id ?? null,
                actorEmail,
                action: opts.action,
                targetType: opts.targetType ?? null,
                targetId: opts.targetId ?? null,
                payload: opts.payload ?? null,
                ip: ip ? String(ip).slice(0, 64) : null,
                userAgent: typeof ua === 'string' ? ua.slice(0, 512) : null,
            });
            await this.repo.save(entity);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            this.logger.warn(`[audit.record] failed: ${msg}`);
        }
    }
    async findOne(id) {
        return this.repo.findOne({ where: { id } });
    }
    async findFiltered(opts) {
        const limit = opts.limit ?? 100;
        const offset = opts.offset ?? 0;
        const qb = this.repo
            .createQueryBuilder('log')
            .orderBy('log.createdAt', 'DESC')
            .take(limit)
            .skip(offset);
        if (opts.action) {
            qb.andWhere('log.action = :action', { action: opts.action });
        }
        if (opts.targetType) {
            qb.andWhere('log.targetType = :targetType', {
                targetType: opts.targetType,
            });
        }
        if (opts.adminUserId) {
            qb.andWhere('log.adminUserId = :adminUserId', {
                adminUserId: opts.adminUserId,
            });
        }
        const [data, total] = await qb.getManyAndCount();
        return { data, total };
    }
    async findRecent(limit = 100, offset = 0) {
        const { data } = await this.findFiltered({ limit, offset });
        return data;
    }
    async exportCsv(opts) {
        const { data } = await this.findFiltered({ ...opts, limit: 10000, offset: 0 });
        const header = 'createdAt,adminUserId,action,targetType,targetId,payload';
        const esc = (v) => {
            const s = v == null ? '' : String(v);
            return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const lines = data.map((r) => {
            const ts = r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt);
            const payload = r.payload == null ? '' : JSON.stringify(r.payload);
            return [ts, r.adminUserId, r.action, r.targetType ?? '', r.targetId ?? '', payload]
                .map(esc)
                .join(',');
        });
        return [header, ...lines].join('\n');
    }
    clampDays(input, min = 30, max = 365) {
        const n = Math.floor(Number(input));
        if (!Number.isFinite(n))
            return min;
        return Math.max(min, Math.min(max, n));
    }
    async previewPurge(olderThanDaysInput) {
        const olderThanDays = this.clampDays(olderThanDaysInput);
        const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
        const wouldDelete = await this.repo
            .createQueryBuilder('log')
            .where('log.createdAt < :cutoff', { cutoff })
            .getCount();
        return {
            wouldDelete,
            cutoffDate: cutoff.toISOString(),
            olderThanDays,
        };
    }
    async purgeOlderThan(olderThanDaysInput, adminUserId) {
        const olderThanDays = this.clampDays(olderThanDaysInput);
        const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
        const result = await this.repo
            .createQueryBuilder()
            .delete()
            .where('createdAt < :cutoff', { cutoff })
            .execute();
        const deleted = Number(result.affected ?? 0);
        const cutoffDate = cutoff.toISOString();
        await this.logAction(adminUserId, 'audit_log.purge', 'audit_log', undefined, {
            olderThanDays,
            deletedCount: deleted,
            cutoffDate,
        });
        return { deleted, cutoffDate, olderThanDays };
    }
    async getStats(daysInput) {
        const days = Math.max(1, Math.min(90, Math.floor(daysInput) || 30));
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const baseWhere = (alias) => `${alias}.createdAt >= :since`;
        const t0 = Date.now();
        const [totalEntries, perDayRaw, topActionsRaw, topAdminsRaw, topTargetTypesRaw] = await Promise.all([
            this.repo
                .createQueryBuilder('log')
                .where(baseWhere('log'), { since })
                .getCount(),
            this.repo
                .createQueryBuilder('log')
                .select('SUBSTR(log.createdAt, 1, 10)', 'date')
                .addSelect('COUNT(*)', 'count')
                .where(baseWhere('log'), { since })
                .groupBy('date')
                .orderBy('date', 'ASC')
                .getRawMany(),
            this.repo
                .createQueryBuilder('log')
                .select('log.action', 'action')
                .addSelect('COUNT(*)', 'count')
                .where(baseWhere('log'), { since })
                .groupBy('log.action')
                .orderBy('count', 'DESC')
                .limit(10)
                .getRawMany(),
            this.repo
                .createQueryBuilder('log')
                .select('log.adminUserId', 'adminUserId')
                .addSelect('COUNT(*)', 'count')
                .where(baseWhere('log'), { since })
                .groupBy('log.adminUserId')
                .orderBy('count', 'DESC')
                .limit(10)
                .getRawMany(),
            this.repo
                .createQueryBuilder('log')
                .select('log.targetType', 'targetType')
                .addSelect('COUNT(*)', 'count')
                .where(baseWhere('log'), { since })
                .andWhere('log.targetType IS NOT NULL')
                .groupBy('log.targetType')
                .orderBy('count', 'DESC')
                .limit(10)
                .getRawMany(),
        ]);
        const entriesPerDay = perDayRaw.map((r) => ({
            date: String(r.date),
            count: Number(r.count),
        }));
        const topActions = topActionsRaw.map((r) => ({
            action: r.action,
            count: Number(r.count),
        }));
        const adminIds = topAdminsRaw.map((r) => r.adminUserId).filter(Boolean);
        const adminUsers = adminIds.length
            ? await this.userRepo
                .createQueryBuilder('u')
                .select(['u.id', 'u.fullName', 'u.email'])
                .whereInIds(adminIds)
                .getMany()
            : [];
        const nameMap = new Map(adminUsers.map((u) => [u.id, u.fullName || u.email || u.id]));
        const topAdmins = topAdminsRaw.map((r) => ({
            adminUserId: r.adminUserId,
            adminName: nameMap.get(r.adminUserId) || r.adminUserId,
            count: Number(r.count),
        }));
        if (process.env.NODE_ENV !== 'production') {
            this.logger.log(`[phase-175] getStats parallel ${Date.now() - t0}ms`);
        }
        const topTargetTypes = topTargetTypesRaw.map((r) => ({
            targetType: r.targetType,
            count: Number(r.count),
        }));
        return {
            totalEntries,
            entriesPerDay,
            topActions,
            topAdmins,
            topTargetTypes,
        };
    }
};
exports.AdminAuditService = AdminAuditService;
exports.AdminAuditService = AdminAuditService = AdminAuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(admin_audit_log_entity_1.AdminAuditLog)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], AdminAuditService);
//# sourceMappingURL=admin-audit.service.js.map