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
exports.TokenTransaction = exports.TxStatus = exports.PaymentMethod = exports.TxType = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
var TxType;
(function (TxType) {
    TxType["PURCHASE"] = "purchase";
    TxType["SPEND"] = "spend";
    TxType["REFUND"] = "refund";
})(TxType || (exports.TxType = TxType = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["BANK"] = "bank";
    PaymentMethod["CRYPTO"] = "crypto";
    PaymentMethod["SYSTEM"] = "system";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var TxStatus;
(function (TxStatus) {
    TxStatus["PENDING"] = "pending";
    TxStatus["COMPLETED"] = "completed";
    TxStatus["FAILED"] = "failed";
})(TxStatus || (exports.TxStatus = TxStatus = {}));
let TokenTransaction = class TokenTransaction {
    id;
    userId;
    user;
    type;
    amount;
    description;
    status;
    paymentMethod;
    paymentRef;
    createdAt;
};
exports.TokenTransaction = TokenTransaction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TokenTransaction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], TokenTransaction.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], TokenTransaction.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-enum', enum: TxType }),
    __metadata("design:type", String)
], TokenTransaction.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], TokenTransaction.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], TokenTransaction.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-enum', enum: TxStatus, default: TxStatus.COMPLETED }),
    __metadata("design:type", String)
], TokenTransaction.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-enum', enum: PaymentMethod, nullable: true }),
    __metadata("design:type", Object)
], TokenTransaction.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TokenTransaction.prototype, "paymentRef", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TokenTransaction.prototype, "createdAt", void 0);
exports.TokenTransaction = TokenTransaction = __decorate([
    (0, typeorm_1.Entity)('token_transactions')
], TokenTransaction);
//# sourceMappingURL=token-transaction.entity.js.map