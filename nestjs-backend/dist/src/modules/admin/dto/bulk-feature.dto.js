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
exports.BulkUnfeatureDto = exports.BulkFeatureDto = void 0;
const class_validator_1 = require("class-validator");
class BulkFeatureDto {
    userIds;
    featuredOrder;
}
exports.BulkFeatureDto = BulkFeatureDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(200),
    (0, class_validator_1.IsUUID)('all', { each: true }),
    __metadata("design:type", Array)
], BulkFeatureDto.prototype, "userIds", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((_o, v) => v !== null),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)([1, 2, 3, null]),
    __metadata("design:type", Object)
], BulkFeatureDto.prototype, "featuredOrder", void 0);
class BulkUnfeatureDto {
    userIds;
}
exports.BulkUnfeatureDto = BulkUnfeatureDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(200),
    (0, class_validator_1.IsUUID)('all', { each: true }),
    __metadata("design:type", Array)
], BulkUnfeatureDto.prototype, "userIds", void 0);
//# sourceMappingURL=bulk-feature.dto.js.map