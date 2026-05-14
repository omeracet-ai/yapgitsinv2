"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatementsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const payment_escrow_entity_1 = require("../escrow/payment-escrow.entity");
const statements_controller_1 = require("./statements.controller");
const statements_service_1 = require("./statements.service");
let StatementsModule = class StatementsModule {
};
exports.StatementsModule = StatementsModule;
exports.StatementsModule = StatementsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([payment_escrow_entity_1.PaymentEscrow])],
        controllers: [statements_controller_1.StatementsController],
        providers: [statements_service_1.StatementsService],
        exports: [statements_service_1.StatementsService],
    })
], StatementsModule);
//# sourceMappingURL=statements.module.js.map