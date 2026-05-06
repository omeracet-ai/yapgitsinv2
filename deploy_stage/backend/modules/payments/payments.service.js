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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const booking_entity_1 = require("../bookings/booking.entity");
const Iyzipay = require('iyzipay');
let PaymentsService = class PaymentsService {
    bookingRepository;
    iyzipay;
    constructor(bookingRepository) {
        this.bookingRepository = bookingRepository;
        const apiKey = process.env.IYZIPAY_API_KEY;
        const secretKey = process.env.IYZIPAY_SECRET_KEY;
        const uri = process.env.IYZIPAY_URI;
        if (!apiKey || !secretKey || !uri) {
            throw new Error('IYZIPAY_API_KEY, IYZIPAY_SECRET_KEY ve IYZIPAY_URI ortam değişkenleri tanımlanmamış');
        }
        this.iyzipay = new Iyzipay({ apiKey, secretKey, uri });
    }
    async getEarnings(workerId) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const completedBookings = await this.bookingRepository.find({
            where: {
                workerId,
                status: booking_entity_1.BookingStatus.COMPLETED,
            },
            order: { updatedAt: 'DESC' },
        });
        const total = completedBookings.reduce((sum, b) => sum + (b.agreedPrice || 0), 0);
        const monthly = completedBookings
            .filter(b => new Date(b.updatedAt) >= thirtyDaysAgo)
            .reduce((sum, b) => sum + (b.agreedPrice || 0), 0);
        const weekly = completedBookings
            .filter(b => new Date(b.updatedAt) >= sevenDaysAgo)
            .reduce((sum, b) => sum + (b.agreedPrice || 0), 0);
        return {
            totalEarnings: total,
            monthlyEarnings: monthly,
            weeklyEarnings: weekly,
            completedCount: completedBookings.length,
            lastTransactions: completedBookings.slice(0, 5).map(b => ({
                id: b.id,
                amount: b.agreedPrice,
                date: b.updatedAt,
                category: b.category,
            })),
        };
    }
    async createCheckoutForm(data) {
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
        return new Promise((resolve, reject) => {
            this.iyzipay.checkoutForm.retrieve({ locale: 'tr', token }, (err, result) => {
                if (err)
                    reject(err instanceof Error ? err : new Error(String(err)));
                else
                    resolve(result);
            });
        });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map