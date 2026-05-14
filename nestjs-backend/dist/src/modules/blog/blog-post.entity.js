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
exports.BlogPost = exports.BlogPostStatus = void 0;
const typeorm_1 = require("typeorm");
var BlogPostStatus;
(function (BlogPostStatus) {
    BlogPostStatus["DRAFT"] = "draft";
    BlogPostStatus["PUBLISHED"] = "published";
    BlogPostStatus["ARCHIVED"] = "archived";
})(BlogPostStatus || (exports.BlogPostStatus = BlogPostStatus = {}));
let BlogPost = class BlogPost {
    id;
    tenantId;
    slug;
    title;
    content;
    excerpt;
    coverImageUrl;
    authorId;
    category;
    tags;
    status;
    publishedAt;
    seoTitle;
    seoDescription;
    createdAt;
    updatedAt;
};
exports.BlogPost = BlogPost;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BlogPost.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, nullable: true }),
    __metadata("design:type", Object)
], BlogPost.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], BlogPost.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], BlogPost.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], BlogPost.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, default: '' }),
    __metadata("design:type", String)
], BlogPost.prototype, "excerpt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], BlogPost.prototype, "coverImageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], BlogPost.prototype, "authorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], BlogPost.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], BlogPost.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-enum', enum: BlogPostStatus, default: BlogPostStatus.DRAFT }),
    __metadata("design:type", String)
], BlogPost.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], BlogPost.prototype, "publishedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200, nullable: true }),
    __metadata("design:type", Object)
], BlogPost.prototype, "seoTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], BlogPost.prototype, "seoDescription", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BlogPost.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], BlogPost.prototype, "updatedAt", void 0);
exports.BlogPost = BlogPost = __decorate([
    (0, typeorm_1.Entity)('blog_posts'),
    (0, typeorm_1.Unique)('UQ_blog_posts_tenant_slug', ['tenantId', 'slug'])
], BlogPost);
//# sourceMappingURL=blog-post.entity.js.map