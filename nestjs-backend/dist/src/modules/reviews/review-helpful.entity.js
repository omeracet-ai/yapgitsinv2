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
exports.ReviewHelpful = void 0;
const typeorm_1 = require("typeorm");
let ReviewHelpful = class ReviewHelpful {
    id;
    reviewId;
    userId;
    createdAt;
};
exports.ReviewHelpful = ReviewHelpful;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ReviewHelpful.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], ReviewHelpful.prototype, "reviewId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], ReviewHelpful.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ReviewHelpful.prototype, "createdAt", void 0);
exports.ReviewHelpful = ReviewHelpful = __decorate([
    (0, typeorm_1.Entity)('review_helpfuls'),
    (0, typeorm_1.Unique)(['reviewId', 'userId'])
], ReviewHelpful);
//# sourceMappingURL=review-helpful.entity.js.map