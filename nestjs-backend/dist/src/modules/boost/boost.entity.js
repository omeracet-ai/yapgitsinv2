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
exports.BOOST_PACKAGES = exports.Boost = exports.BoostStatus = exports.BoostType = void 0;
const typeorm_1 = require("typeorm");
var BoostType;
(function (BoostType) {
    BoostType["FEATURED_24H"] = "featured_24h";
    BoostType["FEATURED_7D"] = "featured_7d";
    BoostType["TOP_SEARCH_24H"] = "top_search_24h";
})(BoostType || (exports.BoostType = BoostType = {}));
var BoostStatus;
(function (BoostStatus) {
    BoostStatus["ACTIVE"] = "active";
    BoostStatus["EXPIRED"] = "expired";
    BoostStatus["CANCELLED"] = "cancelled";
})(BoostStatus || (exports.BoostStatus = BoostStatus = {}));
let Boost = class Boost {
    id;
    userId;
    type;
    tokenCost;
    startsAt;
    expiresAt;
    status;
    createdAt;
};
exports.Boost = Boost;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Boost.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], Boost.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-enum', enum: BoostType }),
    __metadata("design:type", String)
], Boost.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Boost.prototype, "tokenCost", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], Boost.prototype, "startsAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], Boost.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-enum', enum: BoostStatus, default: BoostStatus.ACTIVE }),
    __metadata("design:type", String)
], Boost.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Boost.prototype, "createdAt", void 0);
exports.Boost = Boost = __decorate([
    (0, typeorm_1.Entity)('worker_boosts'),
    (0, typeorm_1.Index)(['userId', 'status']),
    (0, typeorm_1.Index)('idx_worker_boosts_status_expiresAt', ['status', 'expiresAt'])
], Boost);
exports.BOOST_PACKAGES = [
    {
        type: BoostType.FEATURED_24H,
        tokenCost: 50,
        durationHours: 24,
        name: 'Öne Çıkan — 24 Saat',
        description: 'Ana sayfa featured slot, 24 saat boyunca.',
    },
    {
        type: BoostType.FEATURED_7D,
        tokenCost: 250,
        durationHours: 24 * 7,
        name: 'Öne Çıkan — 7 Gün',
        description: 'Ana sayfa featured slot, 7 gün boyunca.',
    },
    {
        type: BoostType.TOP_SEARCH_24H,
        tokenCost: 100,
        durationHours: 24,
        name: 'Aramada İlk 3 — 24 Saat',
        description: 'Usta arama listesinin ilk 3’ünde, 24 saat.',
    },
];
//# sourceMappingURL=boost.entity.js.map