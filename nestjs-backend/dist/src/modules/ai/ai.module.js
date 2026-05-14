"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ai_controller_1 = require("./ai.controller");
const ai_service_1 = require("./ai.service");
const fraud_detection_service_1 = require("./fraud-detection.service");
const semantic_search_service_1 = require("./semantic-search.service");
const pricing_service_1 = require("./pricing.service");
const dispute_mediation_service_1 = require("./dispute-mediation.service");
const translate_service_1 = require("./translate.service");
const recommendation_service_1 = require("./recommendation.service");
const job_entity_1 = require("../jobs/job.entity");
const user_entity_1 = require("../users/user.entity");
let AiModule = class AiModule {
};
exports.AiModule = AiModule;
exports.AiModule = AiModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([job_entity_1.Job, user_entity_1.User])],
        controllers: [ai_controller_1.AiController, ai_controller_1.AiPublicController],
        providers: [
            ai_service_1.AiService,
            fraud_detection_service_1.FraudDetectionService,
            semantic_search_service_1.SemanticSearchService,
            pricing_service_1.PricingService,
            dispute_mediation_service_1.DisputeMediationService,
            translate_service_1.TranslateService,
            recommendation_service_1.RecommendationService,
        ],
        exports: [
            ai_service_1.AiService,
            fraud_detection_service_1.FraudDetectionService,
            semantic_search_service_1.SemanticSearchService,
            pricing_service_1.PricingService,
            dispute_mediation_service_1.DisputeMediationService,
            translate_service_1.TranslateService,
            recommendation_service_1.RecommendationService,
        ],
    })
], AiModule);
//# sourceMappingURL=ai.module.js.map