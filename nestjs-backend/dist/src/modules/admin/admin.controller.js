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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const audit_decorator_1 = require("../admin-audit/audit.decorator");
const audit_interceptor_1 = require("../admin-audit/audit.interceptor");
const passport_1 = require("@nestjs/passport");
const admin_service_1 = require("./admin.service");
const categories_service_1 = require("../categories/categories.service");
const providers_service_1 = require("../providers/providers.service");
const user_blocks_service_1 = require("../user-blocks/user-blocks.service");
const report_user_dto_1 = require("../user-blocks/dto/report-user.dto");
const admin_audit_service_1 = require("../admin-audit/admin-audit.service");
const system_settings_service_1 = require("../system-settings/system-settings.service");
const broadcast_notification_dto_1 = require("./dto/broadcast-notification.dto");
const admin_list_query_dto_1 = require("./dto/admin-list-query.dto");
const bulk_verify_dto_1 = require("./dto/bulk-verify.dto");
const bulk_feature_dto_1 = require("./dto/bulk-feature.dto");
const suspend_user_dto_1 = require("./dto/suspend-user.dto");
const purge_audit_log_dto_1 = require("./dto/purge-audit-log.dto");
const admin_guard_1 = require("../../common/guards/admin.guard");
const worker_insurance_service_1 = require("../users/worker-insurance.service");
const worker_certification_service_1 = require("../users/worker-certification.service");
const data_privacy_service_1 = require("../users/data-privacy.service");
const data_deletion_request_entity_1 = require("../users/data-deletion-request.entity");
let AdminController = class AdminController {
    adminService;
    categoriesService;
    providersService;
    userBlocksService;
    adminAuditService;
    systemSettings;
    insuranceSvc;
    certificationSvc;
    dataPrivacy;
    constructor(adminService, categoriesService, providersService, userBlocksService, adminAuditService, systemSettings, insuranceSvc, certificationSvc, dataPrivacy) {
        this.adminService = adminService;
        this.categoriesService = categoriesService;
        this.providersService = providersService;
        this.userBlocksService = userBlocksService;
        this.adminAuditService = adminAuditService;
        this.systemSettings = systemSettings;
        this.insuranceSvc = insuranceSvc;
        this.certificationSvc = certificationSvc;
        this.dataPrivacy = dataPrivacy;
    }
    async listPendingCertifications() {
        return this.certificationSvc.listPending();
    }
    async verifyCertification(id, body, req) {
        return this.certificationSvc.setVerified(id, true, req.user.id, body.adminNote);
    }
    async rejectCertification(id, body, req) {
        return this.certificationSvc.setVerified(id, false, req.user.id, body.adminNote);
    }
    async listDataDeletionRequests(status) {
        const validStatuses = Object.values(data_deletion_request_entity_1.DataDeletionRequestStatus);
        const filter = status && validStatuses.includes(status)
            ? status
            : undefined;
        return this.dataPrivacy.listDeletionRequests(filter);
    }
    async moderateDataDeletionRequest(id, body, req) {
        if (body.action !== 'approve' && body.action !== 'reject') {
            throw new Error('action approve veya reject olmalı');
        }
        const result = await this.dataPrivacy.moderateDeletionRequest(id, body.action, req.user.id, body.adminNote);
        await this.adminAuditService.logAction(req.user.id, `data_deletion.${body.action}`, 'data_deletion_request', id, body);
        return result;
    }
    async executeDataDeletion(id, req) {
        const result = await this.dataPrivacy.executeDeletion(id, req.user.id);
        await this.adminAuditService.logAction(req.user.id, 'data_deletion.execute', 'data_deletion_request', id, { userId: result.userId });
        return result;
    }
    async verifyInsurance(id, body, req) {
        const result = await this.insuranceSvc.setVerified(id, !!body.verified, req.user.id);
        await this.adminAuditService.logAction(req.user.id, 'user.insurance.verify', 'user', id, body);
        return result;
    }
    async listSettings() {
        return this.systemSettings.getAll();
    }
    async getSetting(key) {
        const value = await this.systemSettings.get(key, '');
        return { key, value };
    }
    async updateSetting(key, body, req) {
        return this.systemSettings.set(key, body.value, req.user.id);
    }
    async getAuditLog(limit, offset, action, targetType, adminUserId) {
        const parsedLimit = Number(limit) || 50;
        const parsedOffset = Number(offset) || 0;
        const { data, total } = await this.adminAuditService.findFiltered({
            limit: parsedLimit,
            offset: parsedOffset,
            action: action || undefined,
            targetType: targetType || undefined,
            adminUserId: adminUserId || undefined,
        });
        return { data, total, limit: parsedLimit, offset: parsedOffset };
    }
    async exportAuditLog(res, action, targetType, adminUserId) {
        const csv = await this.adminAuditService.exportCsv({
            action: action || undefined,
            targetType: targetType || undefined,
            adminUserId: adminUserId || undefined,
        });
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        res.set('Content-Type', 'text/csv; charset=utf-8');
        res.set('Content-Disposition', `attachment; filename="audit-log-${stamp}.csv"`);
        res.send(csv);
    }
    getAuditLogStats(days) {
        const parsed = Number(days) || 30;
        return this.adminAuditService.getStats(parsed);
    }
    getAuditLogPurgePreview(olderThanDays) {
        const raw = Number(olderThanDays);
        const parsed = Number.isFinite(raw) ? Math.floor(raw) : 30;
        const clamped = Math.max(30, Math.min(365, parsed));
        return this.adminAuditService.previewPurge(clamped);
    }
    async purgeAuditLog(body, req) {
        return this.adminAuditService.purgeOlderThan(body.olderThanDays, req.user.id);
    }
    async getAuditLogEntry(id) {
        const entry = await this.adminAuditService.findOne(id);
        if (!entry)
            throw new common_1.NotFoundException('Audit log entry not found');
        return entry;
    }
    getStats() {
        return this.adminService.getDashboardStats();
    }
    getRevenue() {
        return this.adminService.getRevenue();
    }
    getRecentJobs(query) {
        const hasPaging = query.page !== undefined ||
            query.search !== undefined ||
            query.status !== undefined;
        if (!hasPaging) {
            return this.adminService.getRecentJobs(query.limit ? Number(query.limit) : 20);
        }
        return this.adminService.getJobsPaged(query);
    }
    async setJobFeatured(id, body, req) {
        const result = await this.adminService.setJobFeaturedOrder(id, body.featuredOrder ?? null);
        await this.adminAuditService.logAction(req.user.id, 'job.featured', 'job', id, body);
        return result;
    }
    getUsers(query) {
        const hasPaging = query.page !== undefined ||
            query.limit !== undefined ||
            query.search !== undefined ||
            query.status !== undefined;
        if (!hasPaging) {
            return this.adminService.getAllUsers();
        }
        return this.adminService.getUsersPaged(query);
    }
    async bulkVerifyUsers(dto, req) {
        return this.adminService.bulkVerifyUsers(dto, req.user.id);
    }
    async bulkFeatureUsers(dto, req) {
        return this.adminService.bulkFeatureWorkers(dto, req.user.id);
    }
    async bulkUnfeatureUsers(dto, req) {
        return this.adminService.bulkUnfeatureWorkers(dto, req.user.id);
    }
    async suspendUser(id, dto, req) {
        return this.adminService.suspendUser(id, dto, req.user.id);
    }
    async verifyUser(id, body, req) {
        const result = await this.adminService.verifyUser(id, body.identityVerified);
        await this.adminAuditService.logAction(req.user.id, 'user.verify', 'user', id, body);
        return result;
    }
    getServiceRequests(limit) {
        return this.adminService.getAllServiceRequests(limit ? Number(limit) : 50);
    }
    async setServiceRequestFeatured(id, body, req) {
        const result = await this.adminService.setServiceRequestFeaturedOrder(id, body.featuredOrder ?? null);
        await this.adminAuditService.logAction(req.user.id, 'service_request.featured', 'service_request', id, body);
        return result;
    }
    getCategories() {
        return this.categoriesService.findAllIncludingInactive();
    }
    async updateCategory(id, body, req) {
        const result = await this.categoriesService.update(id, body);
        await this.adminAuditService.logAction(req.user.id, 'category.update', 'category', id, body);
        return result;
    }
    getProviders(query) {
        const hasPaging = query.page !== undefined ||
            query.limit !== undefined ||
            query.search !== undefined ||
            query.status !== undefined;
        if (!hasPaging) {
            return this.providersService.findAll();
        }
        return this.providersService.findAllPaged(query);
    }
    async verifyProvider(id, body, req) {
        const result = await this.providersService.setVerified(id, body.isVerified);
        await this.adminAuditService.logAction(req.user.id, 'provider.verify', 'provider', id, body);
        return result;
    }
    async setProviderFeatured(id, body, req) {
        const result = await this.providersService.setFeaturedOrder(id, body.featuredOrder ?? null);
        await this.adminAuditService.logAction(req.user.id, 'provider.featured', 'provider', id, body);
        return result;
    }
    async setUserBadges(id, body, req) {
        const result = await this.adminService.setUserBadges(id, body.badges);
        await this.adminAuditService.logAction(req.user.id, 'user.badges', 'user', id, body);
        return result;
    }
    async grantManualBadge(id, body) {
        return this.adminService.grantManualBadge(id, body.badgeKey);
    }
    async revokeManualBadge(id, body) {
        return this.adminService.revokeManualBadge(id, body.badgeKey);
    }
    async setUserSkills(id, body, req) {
        const result = await this.adminService.setUserSkills(id, body.skills);
        await this.adminAuditService.logAction(req.user.id, 'user.skills', 'user', id, body);
        return result;
    }
    listPromoCodes() {
        return this.adminService.listPromoCodes();
    }
    async createPromoCode(dto, req) {
        const result = await this.adminService.createPromoCode(dto);
        const created = result;
        await this.adminAuditService.logAction(req.user.id, 'promo.create', 'promo_code', created?.id ?? '', dto);
        return result;
    }
    async updatePromoCode(id, dto, req) {
        const result = await this.adminService.updatePromoCode(id, dto);
        await this.adminAuditService.logAction(req.user.id, 'promo.update', 'promo_code', id, dto);
        return result;
    }
    async deletePromoCode(id, req) {
        const result = await this.adminService.deletePromoCode(id);
        await this.adminAuditService.logAction(req.user.id, 'promo.delete', 'promo_code', id);
        return result;
    }
    getFlaggedItems() {
        return this.adminService.getFlaggedItems();
    }
    getModerationQueue(type = 'job', page, limit) {
        return this.adminService.getModerationQueue(type, Number(page) || 1, Number(limit) || 20);
    }
    async moderateItem(type, id, body, req) {
        const result = await this.adminService.moderateItem(type, id, body.action);
        await this.adminAuditService.logAction(req.user.id, `moderation.${type}.${body.action}`, type, id, { action: body.action });
        return result;
    }
    async clearFlaggedChat(id, req) {
        const result = await this.adminService.clearFlaggedChat(id);
        await this.adminAuditService.logAction(req.user.id, 'moderation.chat.delete', 'chat_message', id);
        return result;
    }
    async clearFlaggedQuestion(id, req) {
        const result = await this.adminService.clearFlaggedQuestion(id);
        await this.adminAuditService.logAction(req.user.id, 'moderation.question.delete', 'job_question', id);
        return result;
    }
    async broadcastHistory() {
        return this.adminService.getBroadcastHistory();
    }
    async broadcastNotification(dto, req) {
        const result = await this.adminService.broadcastNotification(dto);
        await this.adminAuditService.logAction(req.user.id, 'notification.broadcast', 'notification', undefined, { segment: result.segment, title: dto.title, sentCount: result.sent });
        return result;
    }
    getReports(status, page, limit) {
        return this.userBlocksService.findReportsPaged(status, Number(page) || 1, Number(limit) || 20);
    }
    async updateReportStatus(id, body, req) {
        const result = await this.userBlocksService.updateReportStatus(id, body.status, body.adminNote);
        await this.adminAuditService.logAction(req.user.id, 'report.review', 'report', id, { newStatus: body.status, reason: result.reason });
        return result;
    }
    async updateReport(id, body, req) {
        const result = await this.userBlocksService.updateReportStatus(id, body.status, body.adminNote);
        await this.adminAuditService.logAction(req.user.id, 'report.update', 'report', id, body);
        return result;
    }
    getAnalyticsOverview() {
        return this.adminService.getAnalyticsOverview();
    }
    async setJobLocation(id, body, req) {
        const result = await this.adminService.setJobLocation(id, body.latitude, body.longitude);
        await this.adminAuditService.logAction(req.user.id, 'job.location.update', 'job', id, body);
        return result;
    }
    async setUserLocation(id, body, req) {
        const result = await this.adminService.setUserLocation(id, body.latitude, body.longitude);
        await this.adminAuditService.logAction(req.user.id, 'user.location.update', 'user', id, body);
        return result;
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('certifications'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listPendingCertifications", null);
__decorate([
    (0, audit_decorator_1.Audit)('certification.verify'),
    (0, common_1.Patch)('certifications/:id/verify'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "verifyCertification", null);
__decorate([
    (0, audit_decorator_1.Audit)('certification.reject'),
    (0, common_1.Patch)('certifications/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "rejectCertification", null);
__decorate([
    (0, common_1.Get)('data-deletion-requests'),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listDataDeletionRequests", null);
__decorate([
    (0, common_1.Patch)('data-deletion-requests/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "moderateDataDeletionRequest", null);
__decorate([
    (0, common_1.Post)('data-deletion-requests/:id/execute'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "executeDataDeletion", null);
__decorate([
    (0, common_1.Patch)('users/:id/insurance/verify'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "verifyInsurance", null);
__decorate([
    (0, common_1.Get)('settings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listSettings", null);
__decorate([
    (0, common_1.Get)('settings/:key'),
    __param(0, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getSetting", null);
__decorate([
    (0, audit_decorator_1.Audit)('setting.update'),
    (0, common_1.Patch)('settings/:key'),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateSetting", null);
__decorate([
    (0, common_1.Get)('audit-log'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('offset')),
    __param(2, (0, common_1.Query)('action')),
    __param(3, (0, common_1.Query)('targetType')),
    __param(4, (0, common_1.Query)('adminUserId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAuditLog", null);
__decorate([
    (0, common_1.Get)('audit-log/export'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Query)('action')),
    __param(2, (0, common_1.Query)('targetType')),
    __param(3, (0, common_1.Query)('adminUserId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "exportAuditLog", null);
__decorate([
    (0, common_1.Get)('audit-log/stats'),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAuditLogStats", null);
__decorate([
    (0, common_1.Get)('audit-log/purge-preview'),
    __param(0, (0, common_1.Query)('olderThanDays')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAuditLogPurgePreview", null);
__decorate([
    (0, common_1.Post)('audit-log/purge'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [purge_audit_log_dto_1.PurgeAuditLogDto, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "purgeAuditLog", null);
__decorate([
    (0, common_1.Get)('audit-log/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAuditLogEntry", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('revenue'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getRevenue", null);
__decorate([
    (0, common_1.Get)('jobs'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_list_query_dto_1.AdminListQueryDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getRecentJobs", null);
__decorate([
    (0, common_1.Patch)('jobs/:id/featured'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "setJobFeatured", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_list_query_dto_1.AdminListQueryDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Post)('users/bulk-verify'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bulk_verify_dto_1.BulkVerifyDto, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "bulkVerifyUsers", null);
__decorate([
    (0, common_1.Post)('users/bulk-feature'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bulk_feature_dto_1.BulkFeatureDto, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "bulkFeatureUsers", null);
__decorate([
    (0, common_1.Post)('users/bulk-unfeature'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bulk_feature_dto_1.BulkUnfeatureDto, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "bulkUnfeatureUsers", null);
__decorate([
    (0, audit_decorator_1.Audit)('user.suspend'),
    (0, common_1.Patch)('users/:id/suspend'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, suspend_user_dto_1.SuspendUserDto, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "suspendUser", null);
__decorate([
    (0, common_1.Patch)('users/:id/verify'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "verifyUser", null);
__decorate([
    (0, common_1.Get)('service-requests'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getServiceRequests", null);
__decorate([
    (0, common_1.Patch)('service-requests/:id/featured'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "setServiceRequestFeatured", null);
__decorate([
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Patch)('categories/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Get)('providers'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_list_query_dto_1.AdminListQueryDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getProviders", null);
__decorate([
    (0, common_1.Patch)('providers/:id/verify'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "verifyProvider", null);
__decorate([
    (0, common_1.Patch)('providers/:id/featured'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "setProviderFeatured", null);
__decorate([
    (0, common_1.Patch)('users/:id/badges'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "setUserBadges", null);
__decorate([
    (0, audit_decorator_1.Audit)('user.badge.grant'),
    (0, common_1.Post)('users/:id/badges/grant'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "grantManualBadge", null);
__decorate([
    (0, audit_decorator_1.Audit)('user.badge.revoke'),
    (0, common_1.Post)('users/:id/badges/revoke'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "revokeManualBadge", null);
__decorate([
    (0, common_1.Patch)('users/:id/skills'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "setUserSkills", null);
__decorate([
    (0, common_1.Get)('promo-codes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listPromoCodes", null);
__decorate([
    (0, common_1.Post)('promo-codes'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createPromoCode", null);
__decorate([
    (0, common_1.Patch)('promo-codes/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updatePromoCode", null);
__decorate([
    (0, common_1.Delete)('promo-codes/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deletePromoCode", null);
__decorate([
    (0, common_1.Get)('moderation/flagged'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getFlaggedItems", null);
__decorate([
    (0, common_1.Get)('moderation/queue'),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getModerationQueue", null);
__decorate([
    (0, common_1.Patch)('moderation/:type/:id'),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "moderateItem", null);
__decorate([
    (0, common_1.Delete)('moderation/chat/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "clearFlaggedChat", null);
__decorate([
    (0, common_1.Delete)('moderation/question/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "clearFlaggedQuestion", null);
__decorate([
    (0, common_1.Get)('notifications/broadcast/history'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "broadcastHistory", null);
__decorate([
    (0, common_1.Post)('notifications/broadcast'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [broadcast_notification_dto_1.BroadcastNotificationDto, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "broadcastNotification", null);
__decorate([
    (0, common_1.Get)('reports'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getReports", null);
__decorate([
    (0, common_1.Patch)('reports/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, report_user_dto_1.UpdateReportStatusDto, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateReportStatus", null);
__decorate([
    (0, common_1.Patch)('reports/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateReport", null);
__decorate([
    (0, common_1.Get)('analytics/overview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAnalyticsOverview", null);
__decorate([
    (0, common_1.Patch)('jobs/:id/location'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "setJobLocation", null);
__decorate([
    (0, common_1.Patch)('users/:id/location'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "setUserLocation", null);
exports.AdminController = AdminController = __decorate([
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), admin_guard_1.AdminGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        categories_service_1.CategoriesService,
        providers_service_1.ProvidersService,
        user_blocks_service_1.UserBlocksService,
        admin_audit_service_1.AdminAuditService,
        system_settings_service_1.SystemSettingsService,
        worker_insurance_service_1.WorkerInsuranceService,
        worker_certification_service_1.WorkerCertificationService,
        data_privacy_service_1.DataPrivacyService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map