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
exports.CancellationPolicy = exports.CancellationAppliesAtStage = exports.CancellationAppliesTo = void 0;
const typeorm_1 = require("typeorm");
var CancellationAppliesTo;
(function (CancellationAppliesTo) {
    CancellationAppliesTo["CUSTOMER_CANCEL"] = "customer_cancel";
    CancellationAppliesTo["TASKER_CANCEL"] = "tasker_cancel";
    CancellationAppliesTo["MUTUAL_CANCEL"] = "mutual_cancel";
    CancellationAppliesTo["DISPUTE_RESOLVED_CUSTOMER"] = "dispute_resolved_customer";
    CancellationAppliesTo["DISPUTE_RESOLVED_TASKER"] = "dispute_resolved_tasker";
})(CancellationAppliesTo || (exports.CancellationAppliesTo = CancellationAppliesTo = {}));
var CancellationAppliesAtStage;
(function (CancellationAppliesAtStage) {
    CancellationAppliesAtStage["BEFORE_ASSIGNMENT"] = "before_assignment";
    CancellationAppliesAtStage["AFTER_ASSIGNMENT"] = "after_assignment";
    CancellationAppliesAtStage["IN_PROGRESS"] = "in_progress";
    CancellationAppliesAtStage["PENDING_COMPLETION"] = "pending_completion";
    CancellationAppliesAtStage["ANY"] = "any";
})(CancellationAppliesAtStage || (exports.CancellationAppliesAtStage = CancellationAppliesAtStage = {}));
let CancellationPolicy = class CancellationPolicy {
    id;
    name;
    appliesTo;
    appliesAtStage;
    minHoursElapsed;
    maxHoursElapsed;
    refundPercentage;
    taskerCompensationPercentage;
    platformFeePercentage;
    priority;
    isActive;
    description;
    createdAt;
    updatedAt;
};
exports.CancellationPolicy = CancellationPolicy;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CancellationPolicy.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], CancellationPolicy.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: CancellationAppliesTo,
    }),
    __metadata("design:type", String)
], CancellationPolicy.prototype, "appliesTo", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: CancellationAppliesAtStage,
        default: CancellationAppliesAtStage.ANY,
    }),
    __metadata("design:type", String)
], CancellationPolicy.prototype, "appliesAtStage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], CancellationPolicy.prototype, "minHoursElapsed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Object)
], CancellationPolicy.prototype, "maxHoursElapsed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], CancellationPolicy.prototype, "refundPercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], CancellationPolicy.prototype, "taskerCompensationPercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], CancellationPolicy.prototype, "platformFeePercentage", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'integer', default: 100 }),
    __metadata("design:type", Number)
], CancellationPolicy.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], CancellationPolicy.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], CancellationPolicy.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CancellationPolicy.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CancellationPolicy.prototype, "updatedAt", void 0);
exports.CancellationPolicy = CancellationPolicy = __decorate([
    (0, typeorm_1.Entity)('cancellation_policies')
], CancellationPolicy);
//# sourceMappingURL=cancellation-policy.entity.js.map