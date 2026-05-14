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
exports.JobDispute = exports.DisputeResolutionStatus = exports.DisputeType = void 0;
const typeorm_1 = require("typeorm");
var DisputeType;
(function (DisputeType) {
    DisputeType["QUALITY"] = "quality";
    DisputeType["PAYMENT"] = "payment";
    DisputeType["NON_DELIVERY"] = "non_delivery";
    DisputeType["INCOMPLETE"] = "incomplete";
    DisputeType["OTHER"] = "other";
})(DisputeType || (exports.DisputeType = DisputeType = {}));
var DisputeResolutionStatus;
(function (DisputeResolutionStatus) {
    DisputeResolutionStatus["OPEN"] = "open";
    DisputeResolutionStatus["UNDER_REVIEW"] = "under_review";
    DisputeResolutionStatus["RESOLVED_CUSTOMER"] = "resolved_customer";
    DisputeResolutionStatus["RESOLVED_TASKER"] = "resolved_tasker";
    DisputeResolutionStatus["RESOLVED_SPLIT"] = "resolved_split";
    DisputeResolutionStatus["DISMISSED"] = "dismissed";
})(DisputeResolutionStatus || (exports.DisputeResolutionStatus = DisputeResolutionStatus = {}));
let JobDispute = class JobDispute {
    id;
    jobId;
    raisedByUserId;
    counterPartyUserId;
    escrowId;
    disputeType;
    reason;
    evidenceUrls;
    resolutionStatus;
    resolutionNotes;
    resolvedByAdminId;
    refundAmount;
    taskerCompensationAmount;
    raisedAt;
    resolvedAt;
    createdAt;
    updatedAt;
};
exports.JobDispute = JobDispute;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], JobDispute.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], JobDispute.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], JobDispute.prototype, "raisedByUserId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], JobDispute.prototype, "counterPartyUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, nullable: true }),
    __metadata("design:type", Object)
], JobDispute.prototype, "escrowId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: DisputeType,
    }),
    __metadata("design:type", String)
], JobDispute.prototype, "disputeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], JobDispute.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], JobDispute.prototype, "evidenceUrls", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: DisputeResolutionStatus,
        default: DisputeResolutionStatus.OPEN,
    }),
    __metadata("design:type", String)
], JobDispute.prototype, "resolutionStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], JobDispute.prototype, "resolutionNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, nullable: true }),
    __metadata("design:type", Object)
], JobDispute.prototype, "resolvedByAdminId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], JobDispute.prototype, "refundAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], JobDispute.prototype, "taskerCompensationAmount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], JobDispute.prototype, "raisedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], JobDispute.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], JobDispute.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], JobDispute.prototype, "updatedAt", void 0);
exports.JobDispute = JobDispute = __decorate([
    (0, typeorm_1.Entity)('job_disputes'),
    (0, typeorm_1.Index)('idx_job_disputes_jobId_status', ['jobId', 'resolutionStatus']),
    (0, typeorm_1.Index)('idx_job_disputes_status_raisedAt', ['resolutionStatus', 'raisedAt'])
], JobDispute);
//# sourceMappingURL=job-dispute.entity.js.map