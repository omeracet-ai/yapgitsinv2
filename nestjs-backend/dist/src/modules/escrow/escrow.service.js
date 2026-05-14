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
var EscrowService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrowService = exports.ALLOWED_TRANSITIONS = void 0;
exports.getPlatformFeeRate = getPlatformFeeRate;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_escrow_entity_1 = require("./payment-escrow.entity");
const money_util_1 = require("../../common/money.util");
const fee_service_1 = require("./fee.service");
const iyzipay_service_1 = require("./iyzipay.service");
exports.ALLOWED_TRANSITIONS = {
    [payment_escrow_entity_1.EscrowStatus.HELD]: [
        payment_escrow_entity_1.EscrowStatus.RELEASED,
        payment_escrow_entity_1.EscrowStatus.REFUNDED,
        payment_escrow_entity_1.EscrowStatus.DISPUTED,
        payment_escrow_entity_1.EscrowStatus.PARTIAL_REFUND,
    ],
    [payment_escrow_entity_1.EscrowStatus.DISPUTED]: [
        payment_escrow_entity_1.EscrowStatus.RELEASED,
        payment_escrow_entity_1.EscrowStatus.REFUNDED,
        payment_escrow_entity_1.EscrowStatus.PARTIAL_REFUND,
    ],
    [payment_escrow_entity_1.EscrowStatus.RELEASED]: [],
    [payment_escrow_entity_1.EscrowStatus.REFUNDED]: [],
    [payment_escrow_entity_1.EscrowStatus.PARTIAL_REFUND]: [],
};
function getPlatformFeeRate() {
    const raw = process.env.PLATFORM_FEE_RATE;
    if (!raw)
        return 0.15;
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed < 0 || parsed > 1)
        return 0.15;
    return parsed;
}
let EscrowService = EscrowService_1 = class EscrowService {
    repo;
    feeService;
    iyzipay;
    logger = new common_1.Logger(EscrowService_1.name);
    constructor(repo, feeService, iyzipay) {
        this.repo = repo;
        this.feeService = feeService;
        this.iyzipay = iyzipay;
    }
    isValidTransition(from, to) {
        const allowed = exports.ALLOWED_TRANSITIONS[from] ?? [];
        return allowed.includes(to);
    }
    feeBreakdownFor(escrow) {
        return this.feeService.calculateFee(escrow.amount);
    }
    withFeeBreakdown(escrow) {
        return { ...escrow, feeBreakdown: this.feeBreakdownFor(escrow) };
    }
    isAdmin(role) {
        return role === 'admin';
    }
    isParty(escrow, userId) {
        return escrow.customerId === userId || escrow.taskerId === userId;
    }
    async hold(args) {
        if (!args.jobId || !args.offerId || !args.customerId || !args.taskerId) {
            throw new common_1.BadRequestException('Missing required escrow parameters');
        }
        if (!(args.amount > 0)) {
            throw new common_1.BadRequestException('Escrow amount must be positive');
        }
        const amountMinor = (0, money_util_1.tlToMinor)(args.amount) ?? 0;
        const feePct = Math.round(this.feeService.getFeePct());
        const platformFeeMinor = (0, money_util_1.pctOfMinor)(amountMinor, feePct);
        const workerPayoutMinor = (0, money_util_1.subMinor)(amountMinor, platformFeeMinor);
        const escrow = this.repo.create({
            jobId: args.jobId,
            offerId: args.offerId,
            amount: args.amount,
            amountMinor,
            platformFeeMinor,
            workerPayoutMinor,
            customerId: args.customerId,
            taskerId: args.taskerId,
            paymentRef: args.paymentRef ?? null,
            paymentProvider: args.paymentProvider ?? 'iyzipay',
            paymentToken: args.paymentToken ?? null,
            status: payment_escrow_entity_1.EscrowStatus.HELD,
            currency: 'TRY',
        });
        return this.repo.save(escrow);
    }
    async initiate(args) {
        const escrow = await this.hold({
            jobId: args.jobId,
            offerId: args.offerId,
            amount: args.amount,
            customerId: args.customerId,
            taskerId: args.taskerId,
            paymentProvider: 'iyzipay',
            paymentToken: args.paymentToken,
        });
        escrow.paymentStatus = 'pending';
        try {
            const cf = await this.iyzipay.createCheckoutForm({
                refId: escrow.id,
                gross: escrow.amount,
                callbackUrl: iyzipay_service_1.IyzipayService.callbackUrl(),
                buyer: args.buyer
                    ? { ...args.buyer, id: escrow.customerId }
                    : { id: escrow.customerId },
                itemName: `Hizmet #${escrow.jobId}`,
            });
            escrow.paymentToken = cf.token;
            await this.repo.save(escrow);
            return {
                escrow,
                paymentInitUrl: cf.paymentPageUrl,
                paymentToken: cf.token,
                checkoutFormContent: cf.checkoutFormContent,
                mock: cf.mock,
            };
        }
        catch (err) {
            this.logger.error(`iyzipay checkout init failed for escrow ${escrow.id}: ${err.message}`);
            escrow.paymentStatus = 'failed';
            await this.repo.save(escrow);
            return {
                escrow,
                paymentInitUrl: null,
                paymentToken: escrow.paymentToken ?? null,
                checkoutFormContent: null,
                mock: this.iyzipay.mockMode,
            };
        }
    }
    async confirmByToken(paymentToken) {
        if (!paymentToken)
            throw new common_1.BadRequestException('Missing payment token');
        const escrow = await this.repo.findOne({ where: { paymentToken } });
        if (!escrow)
            throw new common_1.NotFoundException('Escrow not found for token');
        const result = await this.iyzipay.retrieveCheckout(paymentToken);
        if (result.status === 'SUCCESS') {
            escrow.paymentRef = result.paymentId ?? escrow.paymentRef;
            escrow.paymentTxnId = result.paymentTransactionId ?? escrow.paymentTxnId;
            escrow.paymentStatus = 'paid';
            if (escrow.status !== payment_escrow_entity_1.EscrowStatus.HELD) {
                escrow.status = payment_escrow_entity_1.EscrowStatus.HELD;
            }
        }
        else {
            escrow.paymentStatus = 'failed';
        }
        return this.repo.save(escrow);
    }
    async confirm(paymentToken, paymentRef) {
        const escrow = await this.repo.findOne({ where: { paymentToken } });
        if (!escrow)
            throw new common_1.NotFoundException('Escrow not found for token');
        escrow.paymentRef = paymentRef;
        escrow.paymentStatus = 'paid';
        if (escrow.status !== payment_escrow_entity_1.EscrowStatus.HELD) {
            escrow.status = payment_escrow_entity_1.EscrowStatus.HELD;
        }
        return this.repo.save(escrow);
    }
    async adminResolve(escrowId, action, adminId, adminRole, options) {
        if (!this.isAdmin(adminRole)) {
            throw new common_1.ForbiddenException('Admin role required');
        }
        const escrow = await this.repo.findOne({ where: { id: escrowId } });
        if (!escrow)
            throw new common_1.NotFoundException('Escrow not found');
        if (action === 'release') {
            return this.release(escrowId, adminId, options?.reason, adminRole);
        }
        if (action === 'refund') {
            return this.refund(escrowId, adminId, escrow.amount, options?.reason, adminRole);
        }
        const ratio = options?.splitRatio ?? 0.5;
        if (ratio < 0 || ratio > 1) {
            throw new common_1.BadRequestException('splitRatio must be between 0 and 1');
        }
        if (!this.isValidTransition(escrow.status, payment_escrow_entity_1.EscrowStatus.PARTIAL_REFUND)) {
            throw new common_1.BadRequestException(`Cannot split from status ${escrow.status}`);
        }
        const workerShare = Math.round(escrow.amount * ratio * 100) / 100;
        const refundShare = Math.round((escrow.amount - workerShare) * 100) / 100;
        const feeRate = getPlatformFeeRate() * 100;
        escrow.platformFeePct = feeRate;
        escrow.platformFeeAmount =
            Math.round(workerShare * feeRate) / 100;
        escrow.taskerNetAmount = workerShare - escrow.platformFeeAmount;
        escrow.refundAmount = refundShare;
        const workerShareMinor = (0, money_util_1.tlToMinor)(workerShare) ?? 0;
        const platformFeeMinor = (0, money_util_1.pctOfMinor)(workerShareMinor, Math.round(feeRate));
        escrow.platformFeeMinor = platformFeeMinor;
        escrow.workerPayoutMinor = (0, money_util_1.subMinor)(workerShareMinor, platformFeeMinor);
        escrow.status = payment_escrow_entity_1.EscrowStatus.PARTIAL_REFUND;
        escrow.releasedAt = new Date();
        escrow.refundedAt = new Date();
        escrow.releaseReason = options?.reason ?? 'admin split';
        escrow.refundReason = options?.adminNote ?? null;
        return this.repo.save(escrow);
    }
    async listMy(userId) {
        return this.repo
            .createQueryBuilder('e')
            .where('e.customerId = :uid OR e.taskerId = :uid', { uid: userId })
            .orderBy('e.createdAt', 'DESC')
            .getMany();
    }
    async release(escrowId, byUserId, reason, byUserRole) {
        const escrow = await this.repo.findOne({ where: { id: escrowId } });
        if (!escrow)
            throw new common_1.NotFoundException('Escrow not found');
        const isCustomer = escrow.customerId === byUserId;
        if (!isCustomer && !this.isAdmin(byUserRole)) {
            throw new common_1.ForbiddenException('Only customer or admin may release escrow');
        }
        if (!this.isValidTransition(escrow.status, payment_escrow_entity_1.EscrowStatus.RELEASED)) {
            throw new common_1.BadRequestException(`Cannot release from status ${escrow.status}`);
        }
        const fb = this.feeService.calculateFee(escrow.amount);
        const pct = fb.feePct;
        escrow.platformFeePct = pct;
        escrow.platformFeeAmount = fb.feeAmount;
        escrow.taskerNetAmount = fb.workerNet;
        const amountMinor = escrow.amountMinor || (0, money_util_1.tlToMinor)(escrow.amount) || 0;
        escrow.amountMinor = amountMinor;
        escrow.platformFeeMinor = (0, money_util_1.pctOfMinor)(amountMinor, Math.round(pct));
        escrow.workerPayoutMinor = (0, money_util_1.subMinor)(amountMinor, escrow.platformFeeMinor);
        escrow.status = payment_escrow_entity_1.EscrowStatus.RELEASED;
        escrow.releasedAt = new Date();
        escrow.releaseReason = reason ?? null;
        return this.repo.save(escrow);
    }
    async refund(escrowId, byUserId, amount, reason, byUserRole) {
        const escrow = await this.repo.findOne({ where: { id: escrowId } });
        if (!escrow)
            throw new common_1.NotFoundException('Escrow not found');
        if (!this.isAdmin(byUserRole) && byUserId !== 'system') {
            throw new common_1.ForbiddenException('Only admin or system may refund escrow');
        }
        const refundAmount = amount ?? escrow.amount;
        if (refundAmount <= 0 || refundAmount > escrow.amount) {
            throw new common_1.BadRequestException('Invalid refund amount');
        }
        const isPartial = refundAmount < escrow.amount;
        const target = isPartial
            ? payment_escrow_entity_1.EscrowStatus.PARTIAL_REFUND
            : payment_escrow_entity_1.EscrowStatus.REFUNDED;
        if (!this.isValidTransition(escrow.status, target)) {
            throw new common_1.BadRequestException(`Cannot refund from status ${escrow.status}`);
        }
        if (escrow.paymentProvider === 'iyzipay' && escrow.paymentTxnId) {
            try {
                const r = await this.iyzipay.refund({
                    paymentTransactionId: escrow.paymentTxnId,
                    price: refundAmount,
                });
                if (r.status === 'success') {
                    escrow.paymentStatus = 'refunded';
                }
                else {
                    escrow.refundNeedsAttention = true;
                    this.logger.warn(`iyzipay refund failed for escrow ${escrow.id}: ${r.error ?? 'unknown'} — flagged for admin`);
                }
            }
            catch (err) {
                escrow.refundNeedsAttention = true;
                this.logger.warn(`iyzipay refund threw for escrow ${escrow.id}: ${err.message} — flagged for admin`);
            }
        }
        escrow.status = target;
        escrow.refundedAt = new Date();
        escrow.refundReason = reason ?? null;
        escrow.refundAmount = refundAmount;
        return this.repo.save(escrow);
    }
    async dispute(escrowId, byUserId, reason) {
        const escrow = await this.repo.findOne({ where: { id: escrowId } });
        if (!escrow)
            throw new common_1.NotFoundException('Escrow not found');
        if (!this.isParty(escrow, byUserId)) {
            throw new common_1.ForbiddenException('Only parties may dispute the escrow');
        }
        if (!this.isValidTransition(escrow.status, payment_escrow_entity_1.EscrowStatus.DISPUTED)) {
            throw new common_1.BadRequestException(`Cannot dispute from status ${escrow.status}`);
        }
        escrow.status = payment_escrow_entity_1.EscrowStatus.DISPUTED;
        escrow.disputedAt = new Date();
        escrow.disputeReason = reason ?? null;
        return this.repo.save(escrow);
    }
    async getById(escrowId, requesterId, requesterRole) {
        const escrow = await this.repo.findOne({ where: { id: escrowId } });
        if (!escrow)
            throw new common_1.NotFoundException('Escrow not found');
        if (!this.isParty(escrow, requesterId) && !this.isAdmin(requesterRole)) {
            throw new common_1.ForbiddenException('Not allowed to view this escrow');
        }
        return escrow;
    }
    async getByJob(jobId, requesterId, requesterRole) {
        const escrow = await this.repo.findOne({
            where: { jobId },
            order: { createdAt: 'DESC' },
        });
        if (!escrow)
            return null;
        if (requesterId !== undefined) {
            if (!this.isParty(escrow, requesterId) &&
                !this.isAdmin(requesterRole)) {
                throw new common_1.ForbiddenException('Not allowed to view this escrow');
            }
        }
        return escrow;
    }
    async listForCustomer(customerId) {
        return this.repo.find({
            where: { customerId },
            order: { createdAt: 'DESC' },
        });
    }
    async listForTasker(taskerId) {
        return this.repo.find({
            where: { taskerId },
            order: { createdAt: 'DESC' },
        });
    }
};
exports.EscrowService = EscrowService;
exports.EscrowService = EscrowService = EscrowService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_escrow_entity_1.PaymentEscrow)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        fee_service_1.FeeService,
        iyzipay_service_1.IyzipayService])
], EscrowService);
//# sourceMappingURL=escrow.service.js.map