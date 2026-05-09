import { SelectQueryBuilder, Repository, ObjectLiteral, FindOptionsWhere } from 'typeorm';

/**
 * Phase 160 — Tenant-aware repository helpers.
 *
 * Two consumption patterns:
 *
 * 1. Query Builder:
 *      const qb = repo.createQueryBuilder('j');
 *      applyTenantFilter(qb, 'j', tenantId);
 *      qb.andWhere(...).orderBy(...);
 *
 * 2. Find options:
 *      repo.find({ where: withTenant({ status: 'open' }, tenantId) });
 *
 * Both apply the same semantics:
 *   `tenantId = :tenantId OR tenantId IS NULL`
 *
 * The `IS NULL` fallback covers legacy rows that pre-date the migration
 * backfill — they're treated as belonging to the default tenant. Once
 * backfill is complete in production, a follow-up migration can NOT NULL
 * the column and this helper can drop the OR clause.
 */

export function applyTenantFilter<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  tenantId: string | null | undefined,
): SelectQueryBuilder<T> {
  if (!tenantId) return qb; // no tenant context → no filter (admin/system queries)
  qb.andWhere(
    `(${alias}.tenantId = :__tenantId OR ${alias}.tenantId IS NULL)`,
    { __tenantId: tenantId },
  );
  return qb;
}

/**
 * Merge a tenantId clause into a FindOptionsWhere object. For repositories
 * using `repo.find({ where: ... })` style. The OR-NULL fallback semantics
 * are NOT preserved here (TypeORM's where-object syntax can't express OR
 * cleanly for a single column) — this helper assumes backfill is done.
 * For pre-backfill safety prefer `applyTenantFilter` on a query builder.
 */
export function withTenant<T extends ObjectLiteral>(
  where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  tenantId: string | null | undefined,
): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
  if (!tenantId) return where;
  if (Array.isArray(where)) {
    return where.map((w) => ({ ...w, tenantId } as FindOptionsWhere<T>));
  }
  return { ...where, tenantId } as FindOptionsWhere<T>;
}

/**
 * Convenience: find all rows belonging to a given tenant on any repository.
 * Uses query builder so it gets the `OR IS NULL` legacy fallback.
 */
export async function findAllForTenant<T extends ObjectLiteral>(
  repo: Repository<T>,
  tenantId: string | null | undefined,
  alias = 'e',
): Promise<T[]> {
  const qb = repo.createQueryBuilder(alias);
  applyTenantFilter(qb, alias, tenantId);
  return qb.getMany();
}
