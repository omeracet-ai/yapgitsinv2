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
var IyzipayService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IyzipayService = void 0;
const common_1 = require("@nestjs/common");
const Iyzipay = require('iyzipay');
let IyzipayService = IyzipayService_1 = class IyzipayService {
    logger = new common_1.Logger(IyzipayService_1.name);
    client = null;
    mockMode;
    constructor() {
        const apiKey = process.env.IYZIPAY_API_KEY;
        const secretKey = process.env.IYZIPAY_SECRET_KEY;
        const uri = process.env.IYZIPAY_URI || 'https://sandbox-api.iyzipay.com';
        const placeholder = !apiKey ||
            !secretKey ||
            apiKey.startsWith('change_me') ||
            secretKey.startsWith('change_me');
        this.mockMode = process.env.MOCK_IYZIPAY === '1' || placeholder;
        if (!this.mockMode) {
            try {
                this.client = new Iyzipay({ apiKey, secretKey, uri });
                this.logger.log(`iyzipay initialised (uri=${uri})`);
            }
            catch (err) {
                this.logger.error(`iyzipay init failed, falling back to mock: ${err.message}`);
                this.mockMode = true;
            }
        }
        else {
            this.logger.warn('iyzipay running in MOCK mode (set MOCK_IYZIPAY=0 + real keys to go live)');
        }
    }
    static callbackUrl() {
        const base = process.env.APP_BASE_URL || 'https://yapgitsin.tr';
        return `${base.replace(/\/$/, '')}/backend/payments/iyzipay/callback`;
    }
    async createCheckoutForm(args) {
        const priceStr = args.gross.toFixed(2);
        if (this.mockMode || !this.client) {
            const token = `mock_cf_${args.refId}_${Date.now()}`;
            return {
                token,
                paymentPageUrl: `https://sandbox-cpp.iyzipay.com/?token=${token}`,
                checkoutFormContent: `<!-- mock iyzipay checkout form for ${args.refId} -->`,
                mock: true,
            };
        }
        const b = args.buyer ?? {};
        const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const request = {
            locale: Iyzipay.LOCALE.TR,
            conversationId: args.refId,
            price: priceStr,
            paidPrice: priceStr,
            currency: Iyzipay.CURRENCY.TRY,
            basketId: args.refId,
            paymentGroup: Iyzipay.PAYMENT_GROUP.SUBSCRIPTION,
            callbackUrl: args.callbackUrl,
            enabledInstallments: [1, 2, 3, 6, 9],
            buyer: {
                id: b.id || args.refId,
                name: b.name || 'Yapgitsin',
                surname: b.surname || 'Customer',
                gsmNumber: b.gsmNumber || '+905350000000',
                email: b.email || 'customer@yapgitsin.tr',
                identityNumber: b.identityNumber || '11111111111',
                lastLoginDate: nowStr,
                registrationDate: nowStr,
                registrationAddress: b.address || 'Istanbul',
                ip: b.ip || '85.34.78.112',
                city: b.city || 'Istanbul',
                country: b.country || 'Turkey',
                zipCode: b.zipCode || '34000',
            },
            shippingAddress: {
                contactName: `${b.name || 'Yapgitsin'} ${b.surname || 'Customer'}`,
                city: b.city || 'Istanbul',
                country: b.country || 'Turkey',
                address: b.address || 'Istanbul',
                zipCode: b.zipCode || '34000',
            },
            billingAddress: {
                contactName: `${b.name || 'Yapgitsin'} ${b.surname || 'Customer'}`,
                city: b.city || 'Istanbul',
                country: b.country || 'Turkey',
                address: b.address || 'Istanbul',
                zipCode: b.zipCode || '34000',
            },
            basketItems: [
                {
                    id: args.refId,
                    name: args.itemName || 'Hizmet Ödemesi',
                    category1: 'Hizmet',
                    itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
                    price: priceStr,
                },
            ],
        };
        return new Promise((resolve, reject) => {
            this.client.checkoutFormInitialize.create(request, (err, result) => {
                if (err) {
                    reject(err instanceof Error ? err : new Error(String(err)));
                    return;
                }
                if (result && result.status === 'failure') {
                    reject(new Error(result.errorMessage || 'iyzipay checkout init failed'));
                    return;
                }
                resolve({
                    token: result.token,
                    paymentPageUrl: result.paymentPageUrl ?? null,
                    checkoutFormContent: result.checkoutFormContent ?? null,
                    mock: false,
                });
            });
        });
    }
    async retrieveCheckout(token) {
        if (this.mockMode || !this.client) {
            const ok = !/fail/i.test(token);
            return {
                status: ok ? 'SUCCESS' : 'FAILURE',
                paymentId: ok ? `mock_pid_${token}` : null,
                paymentTransactionId: ok ? `mock_ptid_${token}` : null,
            };
        }
        return new Promise((resolve, reject) => {
            this.client.checkoutForm.retrieve({ locale: Iyzipay.LOCALE.TR, token }, (err, result) => {
                if (err) {
                    reject(err instanceof Error ? err : new Error(String(err)));
                    return;
                }
                const success = result &&
                    result.status === 'success' &&
                    (result.paymentStatus === 'SUCCESS' ||
                        result.paymentStatus === undefined);
                let ptid = null;
                if (result &&
                    Array.isArray(result.itemTransactions) &&
                    result.itemTransactions.length > 0) {
                    ptid = result.itemTransactions[0].paymentTransactionId ?? null;
                }
                resolve({
                    status: success ? 'SUCCESS' : 'FAILURE',
                    paymentId: result?.paymentId ?? null,
                    paymentTransactionId: ptid,
                    raw: result,
                });
            });
        });
    }
    async refund(args) {
        if (!args.paymentTransactionId) {
            return { status: 'failure', refundId: null, error: 'no paymentTransactionId' };
        }
        if (this.mockMode || !this.client) {
            return { status: 'success', refundId: `mock_refund_${args.paymentTransactionId}` };
        }
        return new Promise((resolve) => {
            this.client.refund.create({
                locale: Iyzipay.LOCALE.TR,
                conversationId: `refund_${args.paymentTransactionId}`,
                paymentTransactionId: args.paymentTransactionId,
                price: args.price.toFixed(2),
                currency: Iyzipay.CURRENCY.TRY,
                ip: args.ip || '85.34.78.112',
            }, (err, result) => {
                if (err) {
                    resolve({
                        status: 'failure',
                        refundId: null,
                        error: err instanceof Error ? err.message : String(err),
                    });
                    return;
                }
                if (result && result.status === 'success') {
                    resolve({ status: 'success', refundId: result.paymentId ?? null });
                }
                else {
                    resolve({
                        status: 'failure',
                        refundId: null,
                        error: result?.errorMessage || 'iyzipay refund failed',
                    });
                }
            });
        });
    }
};
exports.IyzipayService = IyzipayService;
exports.IyzipayService = IyzipayService = IyzipayService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], IyzipayService);
//# sourceMappingURL=iyzipay.service.js.map