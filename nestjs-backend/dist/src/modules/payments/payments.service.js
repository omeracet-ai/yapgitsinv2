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
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const booking_entity_1 = require("../bookings/booking.entity");
const payment_entity_1 = require("./payment.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const notification_entity_1 = require("../notifications/notification.entity");
const uuid_1 = require("uuid");
const Iyzipay = require('iyzipay');
let PaymentsService = PaymentsService_1 = class PaymentsService {
    bookingRepository;
    paymentRepository;
    notificationsService;
    iyzipay;
    useStripe;
    stripeApiKey;
    logger = new common_1.Logger(PaymentsService_1.name);
    constructor(bookingRepository, paymentRepository, notificationsService) {
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.notificationsService = notificationsService;
        const apiKey = process.env.IYZIPAY_API_KEY;
        const secretKey = process.env.IYZIPAY_SECRET_KEY;
        const uri = process.env.IYZIPAY_URI;
        if (apiKey && secretKey && uri) {
            this.iyzipay = new Iyzipay({ apiKey, secretKey, uri });
        }
        this.stripeApiKey = process.env.STRIPE_API_KEY || null;
        this.useStripe = !!this.stripeApiKey;
    }
    async createPaymentIntent(customerId, dto) {
        const { workerId, amountMinor, bookingId, description, currency = 'TRY', method = payment_entity_1.PaymentMethod.CARD, receiptEmail, idempotencyKey } = dto;
        if (amountMinor <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than 0');
        }
        const payment = this.paymentRepository.create({
            customerId,
            workerId,
            bookingId: bookingId || null,
            amountMinor,
            currency,
            status: payment_entity_1.PaymentStatus.PENDING,
            method,
            description: description || `Payment to ${workerId}`,
            receiptEmail: receiptEmail || null,
            idempotencyKey: idempotencyKey || (0, uuid_1.v4)(),
            paymentIntentId: (0, uuid_1.v4)(),
        });
        await this.paymentRepository.save(payment);
        return {
            paymentId: payment.id,
            paymentIntentId: payment.paymentIntentId,
            status: payment_entity_1.PaymentStatus.PENDING,
            amountMinor,
            currency,
            method,
        };
    }
    async confirmPayment(customerId, dto) {
        const { paymentIntentId, token, providerTransactionId } = dto;
        const payment = await this.paymentRepository.findOne({
            where: { paymentIntentId, customerId },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment intent not found');
        }
        if (payment.status !== payment_entity_1.PaymentStatus.PENDING) {
            throw new common_1.BadRequestException(`Payment already ${payment.status}`);
        }
        payment.status = payment_entity_1.PaymentStatus.PROCESSING;
        await this.paymentRepository.save(payment);
        try {
            if (payment.method === payment_entity_1.PaymentMethod.MOCK) {
                payment.status = payment_entity_1.PaymentStatus.COMPLETED;
                payment.externalTransactionId = `mock_${(0, uuid_1.v4)()}`;
                payment.completedAt = new Date();
            }
            else if (payment.method === payment_entity_1.PaymentMethod.IYZIPAY && providerTransactionId) {
                payment.status = payment_entity_1.PaymentStatus.COMPLETED;
                payment.externalTransactionId = providerTransactionId;
                payment.completedAt = new Date();
            }
            else if (payment.method === payment_entity_1.PaymentMethod.CARD) {
                if (this.useStripe && this.stripeApiKey) {
                    payment.status = payment_entity_1.PaymentStatus.COMPLETED;
                    payment.externalTransactionId = `stripe_${(0, uuid_1.v4)()}`;
                    payment.completedAt = new Date();
                }
                else {
                    payment.status = payment_entity_1.PaymentStatus.COMPLETED;
                    payment.externalTransactionId = `mock_${(0, uuid_1.v4)()}`;
                    payment.completedAt = new Date();
                }
            }
            await this.paymentRepository.save(payment);
            if (payment.status === payment_entity_1.PaymentStatus.COMPLETED && payment.workerId) {
                void (async () => {
                    try {
                        const amount = (payment.amountMinor / 100).toFixed(2);
                        await this.notificationsService.send({
                            userId: payment.workerId,
                            type: notification_entity_1.NotificationType.SYSTEM,
                            title: 'Ödeme Alındı',
                            body: `${amount} ${payment.currency} ödemeniz tamamlandı.`,
                            refId: payment.id,
                            relatedType: 'user',
                            relatedId: payment.customerId,
                        });
                    }
                    catch (err) {
                        this.logger.warn(`Failed to send payment notification to worker ${payment.workerId}: ${err.message}`);
                    }
                })();
            }
            return {
                paymentId: payment.id,
                status: payment.status,
                externalTransactionId: payment.externalTransactionId,
                completedAt: payment.completedAt,
            };
        }
        catch (error) {
            payment.status = payment_entity_1.PaymentStatus.FAILED;
            payment.errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
            await this.paymentRepository.save(payment);
            throw new common_1.InternalServerErrorException('Payment processing failed');
        }
    }
    async getPaymentHistory(userId, queryDto, isWorker = false) {
        const { skip = 0, take = 20, status, startDate, endDate } = queryDto;
        const query = this.paymentRepository.createQueryBuilder('payment');
        if (isWorker) {
            query.where('payment.workerId = :userId', { userId });
        }
        else {
            query.where('payment.customerId = :userId', { userId });
        }
        if (status) {
            query.andWhere('payment.status = :status', { status });
        }
        if (startDate) {
            query.andWhere('payment.createdAt >= :startDate', { startDate: new Date(startDate) });
        }
        if (endDate) {
            query.andWhere('payment.createdAt <= :endDate', { endDate: new Date(endDate) });
        }
        query.orderBy('payment.createdAt', 'DESC').skip(skip).take(take);
        const [payments, total] = await query.getManyAndCount();
        return {
            payments: payments.map(p => ({
                id: p.id,
                customerId: p.customerId,
                workerId: p.workerId,
                bookingId: p.bookingId,
                amountMinor: p.amountMinor,
                currency: p.currency,
                status: p.status,
                method: p.method,
                externalTransactionId: p.externalTransactionId,
                description: p.description,
                createdAt: p.createdAt,
                completedAt: p.completedAt,
                errorMessage: p.errorMessage,
            })),
            total,
            skip,
            take,
        };
    }
    async getWorkerEarnings(workerId) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const completedPayments = await this.paymentRepository.find({
            where: {
                workerId,
                status: payment_entity_1.PaymentStatus.COMPLETED,
            },
            order: { completedAt: 'DESC' },
        });
        const total = completedPayments.reduce((sum, p) => sum + p.amountMinor, 0);
        const monthly = completedPayments
            .filter(p => p.completedAt && new Date(p.completedAt) >= thirtyDaysAgo)
            .reduce((sum, p) => sum + p.amountMinor, 0);
        const weekly = completedPayments
            .filter(p => p.completedAt && new Date(p.completedAt) >= sevenDaysAgo)
            .reduce((sum, p) => sum + p.amountMinor, 0);
        const completedBookings = await this.bookingRepository.find({
            where: {
                workerId,
                status: booking_entity_1.BookingStatus.COMPLETED,
            },
            order: { updatedAt: 'DESC' },
        });
        const bookingTotal = completedBookings.reduce((sum, b) => sum + (b.agreedPriceMinor || 0), 0);
        const bookingMonthly = completedBookings
            .filter(b => new Date(b.updatedAt) >= thirtyDaysAgo)
            .reduce((sum, b) => sum + (b.agreedPriceMinor || 0), 0);
        const bookingWeekly = completedBookings
            .filter(b => new Date(b.updatedAt) >= sevenDaysAgo)
            .reduce((sum, b) => sum + (b.agreedPriceMinor || 0), 0);
        return {
            totalEarnings: total + bookingTotal,
            monthlyEarnings: monthly + bookingMonthly,
            weeklyEarnings: weekly + bookingWeekly,
            completedPaymentCount: completedPayments.length,
            completedBookingCount: completedBookings.length,
            lastTransactions: [
                ...completedPayments.slice(0, 5).map(p => ({
                    id: p.id,
                    amount: p.amountMinor,
                    date: p.completedAt,
                    type: 'payment',
                    description: p.description,
                })),
                ...completedBookings.slice(0, 5).map(b => ({
                    id: b.id,
                    amount: b.agreedPriceMinor,
                    date: b.updatedAt,
                    type: 'booking',
                    description: b.category,
                })),
            ].sort((a, b) => (b.date ? b.date.getTime() : 0) - (a.date ? a.date.getTime() : 0)),
        };
    }
    async refundPayment(customerId, dto) {
        const { paymentId, amountMinor, reason } = dto;
        const payment = await this.paymentRepository.findOne({
            where: { id: paymentId, customerId },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        if (payment.status !== payment_entity_1.PaymentStatus.COMPLETED) {
            throw new common_1.BadRequestException('Only completed payments can be refunded');
        }
        const refundAmount = amountMinor || payment.amountMinor;
        if (refundAmount > payment.amountMinor) {
            throw new common_1.BadRequestException('Refund amount exceeds payment amount');
        }
        try {
            payment.refundId = `refund_${(0, uuid_1.v4)()}`;
            payment.refundedAmountMinor = refundAmount;
            if (refundAmount === payment.amountMinor) {
                payment.status = payment_entity_1.PaymentStatus.REFUNDED;
            }
            else {
                payment.status = payment_entity_1.PaymentStatus.COMPLETED;
            }
            await this.paymentRepository.save(payment);
            return {
                paymentId: payment.id,
                refundId: payment.refundId,
                amountRefunded: refundAmount,
                status: payment.status,
            };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException('Refund processing failed');
        }
    }
    async createCheckoutForm(data) {
        if (!this.iyzipay) {
            throw new common_1.InternalServerErrorException('Iyzipay not configured');
        }
        const request = {
            locale: Iyzipay.LOCALE.TR,
            conversationId: '123456789',
            price: data.price,
            paidPrice: data.paidPrice,
            currency: Iyzipay.CURRENCY.TRY,
            basketId: data.basketId,
            paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
            callbackUrl: 'http://localhost:3000/payments/callback',
            enabledInstallments: [1, 2, 3, 6, 9],
            buyer: {
                id: data.user.id || 'BY789',
                name: data.user.name || 'John',
                surname: data.user.surname || 'Doe',
                gsmNumber: '+905350000000',
                email: data.user.email || 'email@email.com',
                identityNumber: '74300864791',
                lastLoginDate: '2015-10-05 12:43:35',
                registrationDate: '2013-04-21 15:12:09',
                registrationAddress: 'Nisantasi',
                ip: '85.34.78.112',
                city: 'Istanbul',
                country: 'Turkey',
                zipCode: '34732',
            },
            shippingAddress: {
                contactName: 'Jane Doe',
                city: 'Istanbul',
                country: 'Turkey',
                address: 'Nisantasi',
                zipCode: '34732',
            },
            billingAddress: {
                contactName: 'Jane Doe',
                city: 'Istanbul',
                country: 'Turkey',
                address: 'Nisantasi',
                zipCode: '34732',
            },
            basketItems: [
                {
                    id: 'BI101',
                    name: 'Hizmet Ödemesi',
                    category1: 'Hizmet',
                    itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
                    price: data.price,
                },
            ],
        };
        return new Promise((resolve, reject) => {
            this.iyzipay.checkoutFormInitialize.create(request, (err, result) => {
                if (err)
                    reject(err instanceof Error ? err : new Error(String(err)));
                else
                    resolve(result);
            });
        });
    }
    async retrieveCheckoutResult(token) {
        if (!this.iyzipay) {
            throw new common_1.InternalServerErrorException('Iyzipay not configured');
        }
        return new Promise((resolve, reject) => {
            this.iyzipay.checkoutForm.retrieve({ locale: 'tr', token }, (err, result) => {
                if (err)
                    reject(err instanceof Error ? err : new Error(String(err)));
                else
                    resolve(result);
            });
        });
    }
    async handlePaymentWebhook(event) {
        const { type, data } = event;
        if (type === 'payment.completed') {
            const { paymentIntentId, externalTransactionId } = data;
            const payment = await this.paymentRepository.findOne({
                where: { paymentIntentId },
            });
            if (payment) {
                payment.status = payment_entity_1.PaymentStatus.COMPLETED;
                payment.externalTransactionId = externalTransactionId;
                payment.completedAt = new Date();
                await this.paymentRepository.save(payment);
            }
        }
        else if (type === 'payment.failed') {
            const { paymentIntentId, error } = data;
            const payment = await this.paymentRepository.findOne({
                where: { paymentIntentId },
            });
            if (payment) {
                payment.status = payment_entity_1.PaymentStatus.FAILED;
                payment.errorMessage = error;
                await this.paymentRepository.save(payment);
            }
        }
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __param(1, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map