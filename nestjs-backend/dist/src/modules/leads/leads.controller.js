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
exports.LeadsController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const passport_1 = require("@nestjs/passport");
const leads_service_1 = require("./leads.service");
const job_leads_service_1 = require("./job-leads.service");
const create_lead_dto_1 = require("./dto/create-lead.dto");
const create_job_lead_dto_1 = require("./dto/create-job-lead.dto");
const update_lead_dto_1 = require("./dto/update-lead.dto");
const admin_guard_1 = require("../../common/guards/admin.guard");
const admin_audit_service_1 = require("../admin-audit/admin-audit.service");
let LeadsController = class LeadsController {
    svc;
    jobSvc;
    audit;
    constructor(svc, jobSvc, audit) {
        this.svc = svc;
        this.jobSvc = jobSvc;
        this.audit = audit;
    }
    async create(dto, req) {
        const ipRaw = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.ip ||
            req.socket?.remoteAddress ||
            null;
        const ua = req.headers['user-agent'] || null;
        return this.svc.create(dto, { ipAddress: ipRaw, userAgent: ua });
    }
    list(status, source, from, to, page, limit) {
        return this.svc.findFiltered({
            status,
            source,
            from,
            to,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }
    async update(id, dto, req) {
        const updated = await this.svc.update(id, dto);
        await this.audit.logAction(req.user.id, 'lead.update', 'lead_request', id, {
            status: dto.status,
            hasNotes: dto.notes !== undefined,
        });
        return updated;
    }
    async createJobLead(dto, req) {
        const customerId = req.user?.id || undefined;
        return this.jobSvc.create(dto, customerId);
    }
    async getJobLead(id) {
        return this.jobSvc.findById(id);
    }
    async getUserJobLeads(req, page, limit) {
        return this.jobSvc.findByCustomerId(req.user.id, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
    }
    async updateJobLeadStatus(id, body, req) {
        const updated = await this.jobSvc.updateStatus(id, body.status);
        await this.audit.logAction(req.user.id, 'job-lead.update', 'leads', id, {
            status: body.status,
        });
        return updated;
    }
    async getJobLeadResponses(id) {
        return this.jobSvc.getLeadResponses(id);
    }
};
exports.LeadsController = LeadsController;
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60_000 } }),
    (0, common_1.Post)('leads'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_lead_dto_1.CreateLeadDto, Object]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), admin_guard_1.AdminGuard),
    (0, common_1.Get)('admin/leads'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('source')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "list", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), admin_guard_1.AdminGuard),
    (0, common_1.Patch)('admin/leads/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_lead_dto_1.UpdateLeadDto, Object]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "update", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 86_400_000 } }),
    (0, common_1.Post)('job-leads'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_job_lead_dto_1.CreateJobLeadDto, Object]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "createJobLead", null);
__decorate([
    (0, common_1.Get)('job-leads/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "getJobLead", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('job-leads'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "getUserJobLeads", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), admin_guard_1.AdminGuard),
    (0, common_1.Patch)('job-leads/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "updateJobLeadStatus", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), admin_guard_1.AdminGuard),
    (0, common_1.Get)('job-leads/:id/responses'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "getJobLeadResponses", null);
exports.LeadsController = LeadsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [leads_service_1.LeadsService,
        job_leads_service_1.JobLeadsService,
        admin_audit_service_1.AdminAuditService])
], LeadsController);
//# sourceMappingURL=leads.controller.js.map