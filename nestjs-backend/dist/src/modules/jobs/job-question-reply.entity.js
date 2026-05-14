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
exports.JobQuestionReply = void 0;
const typeorm_1 = require("typeorm");
const job_question_entity_1 = require("./job-question.entity");
const user_entity_1 = require("../users/user.entity");
let JobQuestionReply = class JobQuestionReply {
    id;
    tenantId;
    questionId;
    question;
    userId;
    user;
    text;
    createdAt;
};
exports.JobQuestionReply = JobQuestionReply;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], JobQuestionReply.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, nullable: true }),
    __metadata("design:type", Object)
], JobQuestionReply.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], JobQuestionReply.prototype, "questionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => job_question_entity_1.JobQuestion, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'questionId' }),
    __metadata("design:type", job_question_entity_1.JobQuestion)
], JobQuestionReply.prototype, "question", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], JobQuestionReply.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], JobQuestionReply.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], JobQuestionReply.prototype, "text", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], JobQuestionReply.prototype, "createdAt", void 0);
exports.JobQuestionReply = JobQuestionReply = __decorate([
    (0, typeorm_1.Entity)('job_question_replies')
], JobQuestionReply);
//# sourceMappingURL=job-question-reply.entity.js.map