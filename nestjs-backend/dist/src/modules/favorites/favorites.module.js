"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoritesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const favorite_provider_entity_1 = require("./favorite-provider.entity");
const saved_job_search_entity_1 = require("./saved-job-search.entity");
const user_entity_1 = require("../users/user.entity");
const favorites_service_1 = require("./favorites.service");
const favorites_controller_1 = require("./favorites.controller");
let FavoritesModule = class FavoritesModule {
};
exports.FavoritesModule = FavoritesModule;
exports.FavoritesModule = FavoritesModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([favorite_provider_entity_1.FavoriteProvider, saved_job_search_entity_1.SavedJobSearch, user_entity_1.User])],
        controllers: [favorites_controller_1.FavoritesController],
        providers: [favorites_service_1.FavoritesService],
        exports: [favorites_service_1.FavoritesService],
    })
], FavoritesModule);
//# sourceMappingURL=favorites.module.js.map