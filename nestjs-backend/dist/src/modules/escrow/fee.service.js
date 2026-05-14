"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeService = void 0;
const common_1 = require("@nestjs/common");
let FeeService = class FeeService {
    getFeePct() {
        const rate = process.env.PLATFORM_FEE_RATE;
        if (rate !== undefined && rate !== '') {
            const parsed = parseFloat(rate);
            if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) {
                return Math.round(parsed * 100 * 100) / 100;
            }
        }
        const pct = parseFloat(process.env.PLATFORM_FEE_PCT ?? '10');
        if (Number.isNaN(pct) || pct < 0 || pct > 100)
            return 10;
        return pct;
    }
    calculateFee(grossAmount) {
        const gross = Number.isFinite(grossAmount) && grossAmount > 0 ? grossAmount : 0;
        const feePct = this.getFeePct();
        const feeAmount = Math.round(((gross * feePct) / 100) * 100) / 100;
        const workerNet = Math.round((gross - feeAmount) * 100) / 100;
        return { gross, feePct, feeAmount, workerNet };
    }
};
exports.FeeService = FeeService;
exports.FeeService = FeeService = __decorate([
    (0, common_1.Injectable)()
], FeeService);
//# sourceMappingURL=fee.service.js.map