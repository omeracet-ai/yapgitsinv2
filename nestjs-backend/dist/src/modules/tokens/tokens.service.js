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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokensService = exports.OFFER_TOKEN_COST_MINOR = exports.OFFER_TOKEN_COST = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const token_transaction_entity_1 = require("./token-transaction.entity");
const user_entity_1 = require("../users/user.entity");
const notification_entity_1 = require("../notifications/notification.entity");
const money_util_1 = require("../../common/money.util");
exports.OFFER_TOKEN_COST = 5;
exports.OFFER_TOKEN_COST_MINOR = 500;
let TokensService = class TokensService {
    txRepo;
    userRepo;
    dataSource;
    constructor(txRepo, userRepo, dataSource) {
        this.txRepo = txRepo;
        this.userRepo = userRepo;
        this.dataSource = dataSource;
    }
    async giftTokens(senderId, dto) {
        if (senderId === dto.recipientId) {
            throw new common_1.BadRequestException('Kendine token hediye edemezsin');
        }
        const amount = dto.amount;
        const note = dto.note ?? '';
        return this.dataSource.transaction(async (manager) => {
            const sender = await manager.findOne(user_entity_1.User, { where: { id: senderId } });
            if (!sender)
                throw new common_1.NotFoundException('Gönderen bulunamadı');
            const recipient = await manager.findOne(user_entity_1.User, {
                where: { id: dto.recipientId },
            });
            if (!recipient)
                throw new common_1.NotFoundException('Alıcı bulunamadı');
            if (sender.tokenBalance < amount) {
                throw new common_1.BadRequestException(`Yetersiz bakiye. Gerekli: ${amount}, Mevcut: ${sender.tokenBalance}`);
            }
            sender.tokenBalance = sender.tokenBalance - amount;
            recipient.tokenBalance = recipient.tokenBalance + amount;
            await manager.save(user_entity_1.User, sender);
            await manager.save(user_entity_1.User, recipient);
            const amountMinor = (0, money_util_1.tlToMinor)(amount) ?? 0;
            await manager.save(token_transaction_entity_1.TokenTransaction, [
                manager.create(token_transaction_entity_1.TokenTransaction, {
                    userId: senderId,
                    type: token_transaction_entity_1.TxType.SPEND,
                    amount: -amount,
                    amountMinor: -amountMinor,
                    description: `Hediye → ${recipient.fullName}: ${note}`.trim(),
                    status: token_transaction_entity_1.TxStatus.COMPLETED,
                    paymentMethod: token_transaction_entity_1.PaymentMethod.SYSTEM,
                    paymentRef: `GIFT-${Date.now()}`,
                }),
                manager.create(token_transaction_entity_1.TokenTransaction, {
                    userId: recipient.id,
                    type: token_transaction_entity_1.TxType.PURCHASE,
                    amount: amount,
                    amountMinor,
                    description: `Hediye ← ${sender.fullName}: ${note}`.trim(),
                    status: token_transaction_entity_1.TxStatus.COMPLETED,
                    paymentMethod: token_transaction_entity_1.PaymentMethod.SYSTEM,
                    paymentRef: `GIFT-${Date.now()}`,
                }),
            ]);
            await manager.save(notification_entity_1.Notification, manager.create(notification_entity_1.Notification, {
                userId: recipient.id,
                type: notification_entity_1.NotificationType.SYSTEM,
                title: 'Token Hediyesi',
                body: `${sender.fullName} size ${amount} token gönderdi${note ? `: ${note}` : ''}`,
                refId: senderId,
            }));
            return {
                senderBalance: sender.tokenBalance,
                recipientBalance: recipient.tokenBalance,
                amount,
                recipientName: recipient.fullName,
            };
        });
    }
    async getBalance(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        return { balance: user?.tokenBalance ?? 0 };
    }
    async getHistory(userId) {
        return this.txRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: 50,
        });
    }
    async purchase(userId, amount, paymentMethod) {
        if (amount <= 0)
            throw new common_1.BadRequestException('Geçersiz miktar');
        await this.userRepo.increment({ id: userId }, 'tokenBalance', amount);
        const tx = this.txRepo.create({
            userId,
            type: token_transaction_entity_1.TxType.PURCHASE,
            amount,
            amountMinor: (0, money_util_1.tlToMinor)(amount) ?? 0,
            description: `${amount} token satın alındı (${paymentMethod === token_transaction_entity_1.PaymentMethod.BANK ? 'Banka' : 'Kripto'})`,
            status: token_transaction_entity_1.TxStatus.COMPLETED,
            paymentMethod,
            paymentRef: `REF-${Date.now()}`,
        });
        return this.txRepo.save(tx);
    }
    async spend(userId, amount, description) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user || user.tokenBalance < amount) {
            throw new common_1.BadRequestException(`Yetersiz token bakiyesi. Gerekli: ${amount}, Mevcut: ${user?.tokenBalance ?? 0}`);
        }
        await this.userRepo.decrement({ id: userId }, 'tokenBalance', amount);
        await this.txRepo.save(this.txRepo.create({
            userId,
            type: token_transaction_entity_1.TxType.SPEND,
            amount,
            amountMinor: (0, money_util_1.tlToMinor)(amount) ?? 0,
            description,
            status: token_transaction_entity_1.TxStatus.COMPLETED,
            paymentMethod: null,
            paymentRef: null,
        }));
    }
};
exports.TokensService = TokensService;
exports.TokensService = TokensService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(token_transaction_entity_1.TokenTransaction)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], TokensService);
//# sourceMappingURL=tokens.service.js.map