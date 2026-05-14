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
exports.Job = exports.ALLOWED_TRANSITIONS = exports.JobStatus = void 0;
exports.isValidTransition = isValidTransition;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
const category_entity_1 = require("../categories/category.entity");
var JobStatus;
(function (JobStatus) {
    JobStatus["OPEN"] = "open";
    JobStatus["IN_PROGRESS"] = "in_progress";
    JobStatus["PENDING_COMPLETION"] = "pending_completion";
    JobStatus["COMPLETED"] = "completed";
    JobStatus["CANCELLED"] = "cancelled";
    JobStatus["DISPUTED"] = "disputed";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
exports.ALLOWED_TRANSITIONS = {
    [JobStatus.OPEN]: [JobStatus.IN_PROGRESS, JobStatus.CANCELLED],
    [JobStatus.IN_PROGRESS]: [JobStatus.PENDING_COMPLETION, JobStatus.CANCELLED, JobStatus.DISPUTED],
    [JobStatus.PENDING_COMPLETION]: [JobStatus.COMPLETED, JobStatus.IN_PROGRESS, JobStatus.DISPUTED],
    [JobStatus.COMPLETED]: [JobStatus.DISPUTED],
    [JobStatus.CANCELLED]: [],
    [JobStatus.DISPUTED]: [JobStatus.COMPLETED, JobStatus.CANCELLED],
};
function isValidTransition(from, to) {
    if (from === to)
        return true;
    return exports.ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
let Job = class Job {
    id;
    tenantId;
    title;
    description;
    category;
    categoryId;
    categoryRef;
    location;
    budgetMin;
    budgetMax;
    budgetMinMinor;
    budgetMaxMinor;
    status;
    customerId;
    customer;
    photos;
    videos;
    latitude;
    longitude;
    geohash;
    dueDate;
    qrCode;
    isQrVerified;
    endJobPhotos;
    endJobVideos;
    completionPhotos;
    featuredOrder;
    featuredUntil;
    flagged;
    flagReason;
    fraudScore;
    deletedAt;
    createdAt;
    updatedAt;
};
exports.Job = Job;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Job.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, nullable: true }),
    __metadata("design:type", Object)
], Job.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], Job.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Job.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], Job.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, nullable: true }),
    __metadata("design:type", Object)
], Job.prototype, "categoryId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => category_entity_1.Category, {
        eager: false,
        nullable: true,
        onDelete: 'SET NULL',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'categoryId' }),
    __metadata("design:type", category_entity_1.Category)
], Job.prototype, "categoryRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], Job.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], Job.prototype, "budgetMin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], Job.prototype, "budgetMax", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Object)
], Job.prototype, "budgetMinMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Object)
], Job.prototype, "budgetMaxMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-enum', enum: JobStatus, default: JobStatus.OPEN }),
    __metadata("design:type", String)
], Job.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], Job.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { eager: false, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'customerId' }),
    __metadata("design:type", user_entity_1.User)
], Job.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "photos", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "videos", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], Job.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], Job.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 12, nullable: true }),
    __metadata("design:type", Object)
], Job.prototype, "geohash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, nullable: true, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "qrCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Job.prototype, "isQrVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "endJobPhotos", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "endJobVideos", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "completionPhotos", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "featuredOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], Job.prototype, "featuredUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Job.prototype, "flagged", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Job.prototype, "flagReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Object)
], Job.prototype, "fraudScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], Job.prototype, "deletedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Job.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Job.prototype, "updatedAt", void 0);
exports.Job = Job = __decorate([
    (0, typeorm_1.Entity)('jobs'),
    (0, typeorm_1.Index)('idx_jobs_status_createdAt', ['status', 'createdAt']),
    (0, typeorm_1.Index)('idx_jobs_customerId_status', ['customerId', 'status']),
    (0, typeorm_1.Index)('idx_jobs_categoryId_status_createdAt', ['categoryId', 'status', 'createdAt']),
    (0, typeorm_1.Index)('idx_jobs_featuredUntil', ['featuredUntil']),
    (0, typeorm_1.Index)('idx_jobs_geohash', ['geohash'])
], Job);
//# sourceMappingURL=job.entity.js.map