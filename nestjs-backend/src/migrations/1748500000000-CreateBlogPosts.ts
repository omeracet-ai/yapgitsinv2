import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 258 (Voldi-db) — Provision the `blog_posts` table explicitly.
 *
 * The blog feature (BlogPost entity, `blog_posts` table) was never given a real
 * migration — it relied entirely on TypeORM `synchronize:true`. Phase 257
 * enforced `synchronize:false` in production (Postgres), so a fresh / migrated
 * prod deploy never created the table (or, if an older deploy created a partial
 * one, it may be missing the newer columns added over Phases 158–162). Result:
 * `GET /blog` (findAllPublished) 500s because `blog_posts` / its columns are
 * absent. This migration is the cross-db source of truth so the endpoint returns
 * an empty published list (200) instead of erroring.
 *
 * Columns (mirrors src/modules/blog/blog-post.entity.ts):
 *   - id              uuid/varchar(36) PK
 *   - tenantId        varchar(36) NULL                (indexed)
 *   - slug            varchar(200) NOT NULL
 *   - title           varchar(200) NOT NULL
 *   - content         text NOT NULL
 *   - excerpt         varchar(500) NOT NULL DEFAULT ''
 *   - coverImageUrl   varchar NULL
 *   - authorId        varchar NULL
 *   - category        varchar NULL
 *   - tags            text NULL                       (simple-json — CSV/JSON text)
 *   - status          varchar(32) NOT NULL DEFAULT 'draft' (simple-enum → plain varchar)
 *   - publishedAt     datetime/timestamp NULL
 *   - seoTitle        varchar(200) NULL
 *   - seoDescription  varchar(500) NULL
 *   - createdAt       datetime/timestamp NOT NULL DEFAULT now
 *   - updatedAt       datetime/timestamp NOT NULL DEFAULT now
 *
 * NOTE on `status`: the entity uses `simple-enum` (BlogPostStatus). Following the
 * repo convention for enum-ish columns (see AddEscrowCommissionColumns —
 * confirmationStatus is a plain `varchar(32)`), we provision a plain `varchar(32)`
 * here rather than a Postgres native ENUM type. This keeps the DDL idempotent and
 * driver-agnostic.
 *
 * Indexes:
 *   - idx_blog_posts_tenant            on (tenantId)            — entity @Index()
 *   - UQ_blog_posts_tenant_slug        UNIQUE on (tenantId, slug) — entity @Unique
 *   - idx_blog_posts_status_published  on (status, publishedAt) — findAllPublished
 *   - idx_blog_posts_slug              on (slug)                — findBySlug lookup
 *
 * Defensive / idempotent on BOTH paths:
 *   1. Table missing  → `CREATE TABLE IF NOT EXISTS` provisions everything.
 *   2. Table exists but missing newer columns → `safeAdd` guards add each column,
 *      swallowing "duplicate column" / "already exists".
 *   `CREATE INDEX IF NOT EXISTS` (try/catch for MySQL which lacks IF NOT EXISTS).
 *
 * Driver matrix:
 *   - Postgres: uuid PK + timestamp; everyone else varchar(36) + datetime.
 *   - `text` for content/tags, `varchar(...)` elsewhere — portable across
 *     SQLite / Postgres / MySQL / MariaDB.
 */
export class CreateBlogPosts1748500000000 implements MigrationInterface {
  name = 'CreateBlogPosts1748500000000';

  private async safeAdd(
    qr: QueryRunner,
    table: string,
    column: string,
    ddl: string,
  ): Promise<void> {
    try {
      await qr.query(`ALTER TABLE ${table} ADD COLUMN "${column}" ${ddl}`);
    } catch (err) {
      const msg = (err as Error).message || '';
      if (!/duplicate column name|already exists/i.test(msg)) throw err;
    }
  }

  private async safeIndex(qr: QueryRunner, ddl: string): Promise<void> {
    try {
      await qr.query(ddl);
    } catch (err) {
      const msg = (err as Error).message || '';
      if (!/already exists|duplicate key name/i.test(msg)) throw err;
    }
  }

  public async up(qr: QueryRunner): Promise<void> {
    const driver = qr.connection.options.type;
    const isPg = driver === 'postgres';
    const idType = isPg ? 'uuid' : 'varchar(36)';
    const dtType = isPg ? 'timestamp' : 'datetime';
    const nowDefault = isPg ? 'now()' : 'CURRENT_TIMESTAMP';

    const hasTable = await qr.hasTable('blog_posts');
    if (!hasTable) {
      await qr.query(
        `CREATE TABLE IF NOT EXISTS blog_posts (
          id ${idType} NOT NULL PRIMARY KEY,
          "tenantId" varchar(36) NULL,
          slug varchar(200) NOT NULL,
          title varchar(200) NOT NULL,
          content text NOT NULL,
          excerpt varchar(500) NOT NULL DEFAULT '',
          "coverImageUrl" varchar NULL,
          "authorId" varchar NULL,
          category varchar NULL,
          tags text NULL,
          status varchar(32) NOT NULL DEFAULT 'draft',
          "publishedAt" ${dtType} NULL,
          "seoTitle" varchar(200) NULL,
          "seoDescription" varchar(500) NULL,
          "createdAt" ${dtType} NOT NULL DEFAULT ${nowDefault},
          "updatedAt" ${dtType} NOT NULL DEFAULT ${nowDefault}
        )`,
      );
    } else {
      // Table exists (e.g. created by an older synchronize:true deploy) but may
      // be missing columns added in later phases. Guard-add each one.
      await this.safeAdd(qr, 'blog_posts', 'tenantId', 'varchar(36) NULL');
      await this.safeAdd(
        qr,
        'blog_posts',
        'slug',
        "varchar(200) NOT NULL DEFAULT ''",
      );
      await this.safeAdd(
        qr,
        'blog_posts',
        'title',
        "varchar(200) NOT NULL DEFAULT ''",
      );
      await this.safeAdd(
        qr,
        'blog_posts',
        'content',
        "text NOT NULL DEFAULT ''",
      );
      await this.safeAdd(
        qr,
        'blog_posts',
        'excerpt',
        "varchar(500) NOT NULL DEFAULT ''",
      );
      await this.safeAdd(qr, 'blog_posts', 'coverImageUrl', 'varchar NULL');
      await this.safeAdd(qr, 'blog_posts', 'authorId', 'varchar NULL');
      await this.safeAdd(qr, 'blog_posts', 'category', 'varchar NULL');
      await this.safeAdd(qr, 'blog_posts', 'tags', 'text NULL');
      await this.safeAdd(
        qr,
        'blog_posts',
        'status',
        "varchar(32) NOT NULL DEFAULT 'draft'",
      );
      await this.safeAdd(qr, 'blog_posts', 'publishedAt', `${dtType} NULL`);
      await this.safeAdd(qr, 'blog_posts', 'seoTitle', 'varchar(200) NULL');
      await this.safeAdd(
        qr,
        'blog_posts',
        'seoDescription',
        'varchar(500) NULL',
      );
      await this.safeAdd(
        qr,
        'blog_posts',
        'createdAt',
        `${dtType} NOT NULL DEFAULT ${nowDefault}`,
      );
      await this.safeAdd(
        qr,
        'blog_posts',
        'updatedAt',
        `${dtType} NOT NULL DEFAULT ${nowDefault}`,
      );
    }

    // Indexes (idempotent — IF NOT EXISTS, try/catch covers MySQL).
    await this.safeIndex(
      qr,
      `CREATE INDEX IF NOT EXISTS idx_blog_posts_tenant ON blog_posts ("tenantId")`,
    );
    await this.safeIndex(
      qr,
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_blog_posts_tenant_slug" ON blog_posts ("tenantId", slug)`,
    );
    await this.safeIndex(
      qr,
      `CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published ON blog_posts (status, "publishedAt")`,
    );
    await this.safeIndex(
      qr,
      `CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts (slug)`,
    );
  }

  public async down(qr: QueryRunner): Promise<void> {
    const driver = qr.connection.options.type;
    const isMysql = driver === 'mysql' || driver === 'mariadb';

    const indexes = [
      'idx_blog_posts_slug',
      'idx_blog_posts_status_published',
      'UQ_blog_posts_tenant_slug',
      'idx_blog_posts_tenant',
    ];
    for (const idx of indexes) {
      try {
        if (isMysql) {
          await qr.query(`DROP INDEX \`${idx}\` ON blog_posts`);
        } else {
          await qr.query(`DROP INDEX IF EXISTS "${idx}"`);
        }
      } catch {
        /* ignore */
      }
    }

    try {
      await qr.query(`DROP TABLE IF EXISTS blog_posts`);
    } catch {
      /* ignore */
    }
  }
}
