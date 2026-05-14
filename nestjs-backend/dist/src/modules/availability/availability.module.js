"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const availability_slot_entity_1 = require("./availability-slot.entity");
const availability_blackout_entity_1 = require("./availability-blackout.entity");
const availability_service_1 = require("./availability.service");
const availability_controller_1 = require("./availability.controller");
let AvailabilityModule = class AvailabilityModule {
};
exports.AvailabilityModule = AvailabilityModule;
exports.AvailabilityModule = AvailabilityModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([availability_slot_entity_1.AvailabilitySlot, availability_blackout_entity_1.AvailabilityBlackout])],
        providers: [availability_service_1.AvailabilityService],
        controllers: [availability_controller_1.AvailabilityController],
        exports: [availability_service_1.AvailabilityService],
    })
], AvailabilityModule);
//# sourceMappingURL=availability.module.js.map