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
exports.FavoritesController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const favorites_service_1 = require("./favorites.service");
let FavoritesController = class FavoritesController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    listFavoriteProviders(req) {
        return this.svc.listFavoriteProviders(req.user.id);
    }
    addFavoriteProvider(req, body) {
        return this.svc.addFavoriteProvider(req.user.id, body.providerId, body.notes);
    }
    removeFavoriteProvider(req, providerId) {
        return this.svc.removeFavoriteProvider(req.user.id, providerId);
    }
    listSavedSearches(req) {
        return this.svc.listSavedSearches(req.user.id);
    }
    createSavedSearch(req, body) {
        return this.svc.createSavedSearch(req.user.id, body.name, body.criteria);
    }
    updateSavedSearch(req, id, body) {
        return this.svc.updateSavedSearch(req.user.id, id, body);
    }
    deleteSavedSearch(req, id) {
        return this.svc.deleteSavedSearch(req.user.id, id);
    }
    listSavedSearchesAlias(req) {
        return this.svc.listSavedSearches(req.user.id);
    }
    createSavedSearchAlias(req, body) {
        return this.svc.createSavedSearch(req.user.id, body.name, body.criteria, body.alertEnabled);
    }
    updateSavedSearchAlias(req, id, body) {
        return this.svc.updateSavedSearch(req.user.id, id, body);
    }
    deleteSavedSearchAlias(req, id) {
        return this.svc.deleteSavedSearch(req.user.id, id);
    }
};
exports.FavoritesController = FavoritesController;
__decorate([
    (0, common_1.Get)('favorites/providers'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FavoritesController.prototype, "listFavoriteProviders", null);
__decorate([
    (0, common_1.Post)('favorites/providers'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FavoritesController.prototype, "addFavoriteProvider", null);
__decorate([
    (0, common_1.Delete)('favorites/providers/:providerId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('providerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FavoritesController.prototype, "removeFavoriteProvider", null);
__decorate([
    (0, common_1.Get)('saved-searches/jobs'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FavoritesController.prototype, "listSavedSearches", null);
__decorate([
    (0, common_1.Post)('saved-searches/jobs'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FavoritesController.prototype, "createSavedSearch", null);
__decorate([
    (0, common_1.Patch)('saved-searches/jobs/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], FavoritesController.prototype, "updateSavedSearch", null);
__decorate([
    (0, common_1.Delete)('saved-searches/jobs/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FavoritesController.prototype, "deleteSavedSearch", null);
__decorate([
    (0, common_1.Get)('saved-searches'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FavoritesController.prototype, "listSavedSearchesAlias", null);
__decorate([
    (0, common_1.Post)('saved-searches'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FavoritesController.prototype, "createSavedSearchAlias", null);
__decorate([
    (0, common_1.Patch)('saved-searches/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], FavoritesController.prototype, "updateSavedSearchAlias", null);
__decorate([
    (0, common_1.Delete)('saved-searches/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FavoritesController.prototype, "deleteSavedSearchAlias", null);
exports.FavoritesController = FavoritesController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [favorites_service_1.FavoritesService])
], FavoritesController);
//# sourceMappingURL=favorites.controller.js.map