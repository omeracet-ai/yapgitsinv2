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
exports.DataDeletionRequest = exports.DataDeletionRequestStatus = void 0;
const typeorm_1 = require("typeorm");
var DataDeletionRequestStatus;
(function (DataDeletionRequestStatus) {
    DataDeletionRequestStatus["PENDING"] = "pending";
    DataDeletionRequestStatus["APPROVED"] = "approved";
    DataDeletionRequestStatus["REJECTED"] = "rejected";
    DataDeletionRequestStatus["COMPLETED"] = "completed";
})(DataDeletionRequestStatus || (exports.DataDeletionRequestStatus = DataDeletionRequestStatus = {}));
let DataDeletionRequest = class DataDeletionRequest {
    id;
    userId;
    reason;
    status;
    createdAt;
    scheduledDeletionAt;
    processedAt;
    processedBy;
    adminNote;
};
exports.DataDeletionRequest = DataDeletionRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DataDeletionRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], DataDeletionRequest.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], DataDeletionRequest.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: DataDeletionRequestStatus,
        default: DataDeletionRequestStatus.PENDING,
    }),
    __metadata("design:type", String)
], DataDeletionRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], DataDeletionRequest.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], DataDeletionRequest.prototype, "scheduledDeletionAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], DataDeletionRequest.prototype, "processedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, nullable: true }),
    __metadata("design:type", Object)
], DataDeletionRequest.prototype, "processedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], DataDeletionRequest.prototype, "adminNote", void 0);
exports.DataDeletionRequest = DataDeletionRequest = __decorate([
    (0, typeorm_1.Entity)('data_deletion_requests')
], DataDeletionRequest);
//# sourceMappingURL=data-deletion-request.entity.js.map