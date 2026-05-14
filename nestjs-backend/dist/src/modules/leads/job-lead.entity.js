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
exports.JobLead = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
const job_lead_response_entity_1 = require("./job-lead-response.entity");
let JobLead = class JobLead {
    id;
    customerId;
    category;
    city;
    description;
    budgetMin;
    budgetMax;
    budgetVisible;
    requesterName;
    requesterPhone;
    requesterEmail;
    preferredContactTime;
    status;
    attachments;
    createdAt;
    updatedAt;
    customer;
    responses;
};
exports.JobLead = JobLead;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], JobLead.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, nullable: true }),
    __metadata("design:type", Object)
], JobLead.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], JobLead.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], JobLead.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], JobLead.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Object)
], JobLead.prototype, "budgetMin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Object)
], JobLead.prototype, "budgetMax", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], JobLead.prototype, "budgetVisible", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], JobLead.prototype, "requesterName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: false }),
    __metadata("design:type", String)
], JobLead.prototype, "requesterPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], JobLead.prototype, "requesterEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'flexible' }),
    __metadata("design:type", String)
], JobLead.prototype, "preferredContactTime", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'open' }),
    __metadata("design:type", String)
], JobLead.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], JobLead.prototype, "attachments", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], JobLead.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], JobLead.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'customerId' }),
    __metadata("design:type", Object)
], JobLead.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => job_lead_response_entity_1.JobLeadResponse, (response) => response.lead, { cascade: true }),
    __metadata("design:type", Array)
], JobLead.prototype, "responses", void 0);
exports.JobLead = JobLead = __decorate([
    (0, typeorm_1.Entity)('leads'),
    (0, typeorm_1.Index)('idx_leads_status_createdAt', ['status', 'createdAt']),
    (0, typeorm_1.Index)('idx_leads_customerId_status', ['customerId', 'status']),
    (0, typeorm_1.Index)('idx_leads_category_city_status', ['category', 'city', 'status'])
], JobLead);
//# sourceMappingURL=job-lead.entity.js.map