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
exports.Dispute = exports.GeneralDisputeStatus = exports.GeneralDisputeType = void 0;
const typeorm_1 = require("typeorm");
var GeneralDisputeType;
(function (GeneralDisputeType) {
    GeneralDisputeType["QUALITY"] = "quality";
    GeneralDisputeType["PAYMENT"] = "payment";
    GeneralDisputeType["NO_SHOW"] = "no_show";
    GeneralDisputeType["FRAUD"] = "fraud";
    GeneralDisputeType["OTHER"] = "other";
})(GeneralDisputeType || (exports.GeneralDisputeType = GeneralDisputeType = {}));
var GeneralDisputeStatus;
(function (GeneralDisputeStatus) {
    GeneralDisputeStatus["OPEN"] = "open";
    GeneralDisputeStatus["IN_REVIEW"] = "in_review";
    GeneralDisputeStatus["RESOLVED"] = "resolved";
    GeneralDisputeStatus["DISMISSED"] = "dismissed";
})(GeneralDisputeStatus || (exports.GeneralDisputeStatus = GeneralDisputeStatus = {}));
let Dispute = class Dispute {
    id;
    jobId;
    bookingId;
    raisedBy;
    againstUserId;
    type;
    description;
    status;
    resolution;
    resolvedAt;
    resolvedBy;
    aiAnalysis;
    createdAt;
};
exports.Dispute = Dispute;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Dispute.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, nullable: true }),
    __metadata("design:type", Object)
], Dispute.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, nullable: true }),
    __metadata("design:type", Object)
], Dispute.prototype, "bookingId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], Dispute.prototype, "raisedBy", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], Dispute.prototype, "againstUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-enum', enum: GeneralDisputeType }),
    __metadata("design:type", String)
], Dispute.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Dispute.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: GeneralDisputeStatus,
        default: GeneralDisputeStatus.OPEN,
    }),
    __metadata("design:type", String)
], Dispute.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Dispute.prototype, "resolution", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], Dispute.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, nullable: true }),
    __metadata("design:type", Object)
], Dispute.prototype, "resolvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], Dispute.prototype, "aiAnalysis", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Dispute.prototype, "createdAt", void 0);
exports.Dispute = Dispute = __decorate([
    (0, typeorm_1.Entity)('disputes')
], Dispute);
//# sourceMappingURL=dispute.entity.js.map