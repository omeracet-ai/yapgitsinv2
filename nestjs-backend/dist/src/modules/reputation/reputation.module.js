"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReputationModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const reputation_entity_1 = require("./reputation.entity");
const badge_entity_1 = require("./badge.entity");
const review_entity_1 = require("../reviews/review.entity");
const reputation_service_1 = require("./reputation.service");
const badge_service_1 = require("./badge.service");
const reputation_controller_1 = require("./reputation.controller");
const users_module_1 = require("../users/users.module");
const reviews_module_1 = require("../reviews/reviews.module");
let ReputationModule = class ReputationModule {
};
exports.ReputationModule = ReputationModule;
exports.ReputationModule = ReputationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([reputation_entity_1.Reputation, badge_entity_1.Badge, review_entity_1.Review]),
            (0, common_1.forwardRef)(() => users_module_1.UsersModule),
            (0, common_1.forwardRef)(() => reviews_module_1.ReviewsModule),
        ],
        controllers: [reputation_controller_1.ReputationController],
        providers: [reputation_service_1.ReputationService, badge_service_1.BadgeService],
        exports: [reputation_service_1.ReputationService, badge_service_1.BadgeService],
    })
], ReputationModule);
//# sourceMappingURL=reputation.module.js.map