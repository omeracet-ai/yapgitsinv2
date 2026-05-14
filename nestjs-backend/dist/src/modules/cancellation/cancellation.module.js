"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancellationModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const cancellation_policy_entity_1 = require("./cancellation-policy.entity");
const cancellation_service_1 = require("./cancellation.service");
const cancellation_controller_1 = require("./cancellation.controller");
let CancellationModule = class CancellationModule {
};
exports.CancellationModule = CancellationModule;
exports.CancellationModule = CancellationModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([cancellation_policy_entity_1.CancellationPolicy])],
        controllers: [cancellation_controller_1.CancellationController],
        providers: [cancellation_service_1.CancellationService],
        exports: [cancellation_service_1.CancellationService],
    })
], CancellationModule);
//# sourceMappingURL=cancellation.module.js.map