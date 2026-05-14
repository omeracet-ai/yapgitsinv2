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
exports.BlogAdminController = exports.BlogPublicController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const blog_service_1 = require("./blog.service");
const blog_post_dto_1 = require("./dto/blog-post.dto");
const admin_guard_1 = require("../../common/guards/admin.guard");
const admin_audit_service_1 = require("../admin-audit/admin-audit.service");
let BlogPublicController = class BlogPublicController {
    blog;
    constructor(blog) {
        this.blog = blog;
    }
    list(req, page, limit, tag) {
        return this.blog.findAllPublished(Number(page) || 1, Number(limit) || 20, tag, req.tenant?.id);
    }
    detail(slug, req) {
        return this.blog.findBySlug(slug, req.tenant?.id);
    }
};
exports.BlogPublicController = BlogPublicController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('tag')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], BlogPublicController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':slug'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BlogPublicController.prototype, "detail", null);
exports.BlogPublicController = BlogPublicController = __decorate([
    (0, common_1.Controller)('blog'),
    __metadata("design:paramtypes", [blog_service_1.BlogService])
], BlogPublicController);
let BlogAdminController = class BlogAdminController {
    blog;
    audit;
    constructor(blog, audit) {
        this.blog = blog;
        this.audit = audit;
    }
    list(req, page, limit) {
        return this.blog.adminFindAll(Number(page) || 1, Number(limit) || 50, req.tenant?.id);
    }
    one(id, req) {
        return this.blog.adminFindOne(id, req.tenant?.id);
    }
    async create(dto, req) {
        const post = await this.blog.adminCreate(dto, req.tenant?.id);
        await this.audit.logAction(req.user.id, 'blog.create', 'blog_post', post.id, {
            slug: post.slug,
            title: post.title,
            status: post.status,
            tenantId: post.tenantId,
        });
        return post;
    }
    async update(id, dto, req) {
        const post = await this.blog.adminUpdate(id, dto, req.tenant?.id);
        await this.audit.logAction(req.user.id, 'blog.update', 'blog_post', id, dto);
        return post;
    }
    async remove(id, req) {
        const result = await this.blog.adminDelete(id, req.tenant?.id);
        await this.audit.logAction(req.user.id, 'blog.delete', 'blog_post', id);
        return result;
    }
};
exports.BlogAdminController = BlogAdminController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], BlogAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BlogAdminController.prototype, "one", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [blog_post_dto_1.CreateBlogPostDto, Object]),
    __metadata("design:returntype", Promise)
], BlogAdminController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, blog_post_dto_1.UpdateBlogPostDto, Object]),
    __metadata("design:returntype", Promise)
], BlogAdminController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BlogAdminController.prototype, "remove", null);
exports.BlogAdminController = BlogAdminController = __decorate([
    (0, common_1.Controller)('admin/blog'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), admin_guard_1.AdminGuard),
    __metadata("design:paramtypes", [blog_service_1.BlogService,
        admin_audit_service_1.AdminAuditService])
], BlogAdminController);
//# sourceMappingURL=blog.controller.js.map