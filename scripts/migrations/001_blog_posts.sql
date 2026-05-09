-- Phase 165: blog_posts table for tenant-aware blog module
-- Idempotent: safe to re-run.
-- Matches BlogPost entity (nestjs-backend/src/modules/blog/blog-post.entity.ts).

CREATE TABLE IF NOT EXISTS blog_posts (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY,
  tenantId      VARCHAR(36)  NULL,
  slug          VARCHAR(200) NOT NULL,
  title         VARCHAR(200) NOT NULL,
  content       TEXT         NOT NULL,
  excerpt       VARCHAR(500) NOT NULL DEFAULT '',
  coverImageUrl VARCHAR(255) NULL,
  authorId      VARCHAR(255) NULL,
  tags          TEXT         NULL,
  status        ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  publishedAt   DATETIME     NULL,
  createdAt     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX IDX_blog_posts_tenantId (tenantId),
  UNIQUE KEY UQ_blog_posts_tenant_slug (tenantId, slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
