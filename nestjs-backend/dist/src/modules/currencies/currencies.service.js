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
exports.CurrenciesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const currency_entity_1 = require("./currency.entity");
const SEED = [
    { code: 'TRY', symbol: '₺', name: 'Türk Lirası', rateToBase: 1.0 },
    { code: 'USD', symbol: '$', name: 'US Dollar', rateToBase: 0.029 },
    { code: 'EUR', symbol: '€', name: 'Euro', rateToBase: 0.027 },
    { code: 'AZN', symbol: '₼', name: 'Azerbaijani Manat', rateToBase: 0.05 },
    { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge', rateToBase: 14.5 },
    { code: 'UZS', symbol: 'soʼm', name: 'Uzbekistani Som', rateToBase: 365 },
];
let CurrenciesService = class CurrenciesService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async onModuleInit() {
        const count = await this.repo.count();
        if (count === 0) {
            await this.repo.save(SEED.map((s) => this.repo.create({ ...s, isActive: true })));
        }
    }
    listActive() {
        return this.repo.find({ where: { isActive: true }, order: { code: 'ASC' } });
    }
    async findOne(code) {
        return this.repo.findOne({ where: { code: code.toUpperCase() } });
    }
    async setRate(code, rateToBase) {
        const cur = await this.findOne(code);
        if (!cur)
            throw new common_1.BadRequestException('currency not found');
        cur.rateToBase = rateToBase;
        return this.repo.save(cur);
    }
    async convert(amount, fromCode, toCode) {
        const from = fromCode.toUpperCase();
        const to = toCode.toUpperCase();
        if (from === to)
            return amount;
        const fromCur = await this.findOne(from);
        const toCur = await this.findOne(to);
        if (!fromCur || !toCur)
            throw new common_1.BadRequestException('unknown currency');
        const inTry = fromCur.rateToBase === 0 ? 0 : amount / fromCur.rateToBase;
        return inTry * toCur.rateToBase;
    }
    async formatPrice(amount, code) {
        const cur = await this.findOne(code);
        const symbol = cur?.symbol ?? '₺';
        return `${amount.toFixed(2)} ${symbol}`;
    }
};
exports.CurrenciesService = CurrenciesService;
exports.CurrenciesService = CurrenciesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(currency_entity_1.Currency)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CurrenciesService);
//# sourceMappingURL=currencies.service.js.map