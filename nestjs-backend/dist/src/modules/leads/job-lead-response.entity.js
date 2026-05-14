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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobLeadResponse = void 0;
const typeorm_1 = require("typeorm");
const job_lead_entity_1 = require("./job-lead.entity");
const user_entity_1 = require("../users/user.entity");
let JobLeadResponse = class JobLeadResponse {
    id;
    leadId;
    workerId;
    status;
    workerMessage;
    respondedAt;
    createdAt;
    updatedAt;
    lead;
    worker;
};
exports.JobLeadResponse = JobLeadResponse;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], JobLeadResponse.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], JobLeadResponse.prototype, "leadId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], JobLeadResponse.prototype, "workerId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'sent_email' }),
    __metadata("design:type", String)
], JobLeadResponse.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], JobLeadResponse.prototype, "workerMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], JobLeadResponse.prototype, "respondedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], JobLeadResponse.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], JobLeadResponse.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => job_lead_entity_1.JobLead, (lead) => lead.responses, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'leadId' }),
    __metadata("design:type", job_lead_entity_1.JobLead)
], JobLeadResponse.prototype, "lead", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'workerId' }),
    __metadata("design:type", user_entity_1.User)
], JobLeadResponse.prototype, "worker", void 0);
exports.JobLeadResponse = JobLeadResponse = __decorate([
    (0, typeorm_1.Entity)('lead_responses')
], JobLeadResponse);
//# sourceMappingURL=job-lead-response.entity.js.map