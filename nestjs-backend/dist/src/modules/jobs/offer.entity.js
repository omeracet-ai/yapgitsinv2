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
exports.Offer = exports.OfferStatus = void 0;
const typeorm_1 = require("typeorm");
const job_entity_1 = require("../jobs/job.entity");
const user_entity_1 = require("../users/user.entity");
var OfferStatus;
(function (OfferStatus) {
    OfferStatus["PENDING"] = "pending";
    OfferStatus["ACCEPTED"] = "accepted";
    OfferStatus["REJECTED"] = "rejected";
    OfferStatus["WITHDRAWN"] = "withdrawn";
    OfferStatus["COUNTERED"] = "countered";
})(OfferStatus || (exports.OfferStatus = OfferStatus = {}));
let Offer = class Offer {
    id;
    tenantId;
    jobId;
    job;
    userId;
    user;
    price;
    priceMinor;
    message;
    status;
    counterPrice;
    counterPriceMinor;
    counterMessage;
    parentOfferId;
    negotiationRound;
    attachmentUrls;
    lineItems;
    createdAt;
    updatedAt;
};
exports.Offer = Offer;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Offer.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, nullable: true }),
    __metadata("design:type", Object)
], Offer.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], Offer.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => job_entity_1.Job, { eager: false, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'jobId' }),
    __metadata("design:type", job_entity_1.Job)
], Offer.prototype, "job", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], Offer.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { eager: false, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], Offer.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], Offer.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Offer.prototype, "priceMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Offer.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: OfferStatus,
        default: OfferStatus.PENDING,
    }),
    __metadata("design:type", String)
], Offer.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true, default: null }),
    __metadata("design:type", Object)
], Offer.prototype, "counterPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true, default: null }),
    __metadata("design:type", Object)
], Offer.prototype, "counterPriceMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, default: null }),
    __metadata("design:type", Object)
], Offer.prototype, "counterMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, nullable: true, default: null }),
    __metadata("design:type", Object)
], Offer.prototype, "parentOfferId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Offer.prototype, "negotiationRound", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true, default: null }),
    __metadata("design:type", Object)
], Offer.prototype, "attachmentUrls", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], Offer.prototype, "lineItems", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Offer.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Offer.prototype, "updatedAt", void 0);
exports.Offer = Offer = __decorate([
    (0, typeorm_1.Entity)('offers'),
    (0, typeorm_1.Index)('idx_offers_jobId_status', ['jobId', 'status']),
    (0, typeorm_1.Index)('idx_offers_userId_status_createdAt', ['userId', 'status', 'createdAt']),
    (0, typeorm_1.Index)('idx_offers_parentOfferId', ['parentOfferId'])
], Offer);
//# sourceMappingURL=offer.entity.js.map