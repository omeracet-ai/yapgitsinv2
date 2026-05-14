"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoostModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const boost_entity_1 = require("./boost.entity");
const user_entity_1 = require("../users/user.entity");
const token_transaction_entity_1 = require("../tokens/token-transaction.entity");
const boost_service_1 = require("./boost.service");
const boost_controller_1 = require("./boost.controller");
let BoostModule = class BoostModule {
};
exports.BoostModule = BoostModule;
exports.BoostModule = BoostModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([boost_entity_1.Boost, user_entity_1.User, token_transaction_entity_1.TokenTransaction])],
        providers: [boost_service_1.BoostService],
        controllers: [boost_controller_1.BoostController],
        exports: [boost_service_1.BoostService],
    })
], BoostModule);
//# sourceMappingURL=boost.module.js.map