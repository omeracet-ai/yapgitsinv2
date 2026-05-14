"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyTenantFilter = applyTenantFilter;
exports.withTenant = withTenant;
exports.findAllForTenant = findAllForTenant;
function applyTenantFilter(qb, alias, tenantId) {
    if (!tenantId)
        return qb;
    qb.andWhere(`(${alias}.tenantId = :__tenantId OR ${alias}.tenantId IS NULL)`, { __tenantId: tenantId });
    return qb;
}
function withTenant(where, tenantId) {
    if (!tenantId)
        return where;
    if (Array.isArray(where)) {
        return where.map((w) => ({ ...w, tenantId }));
    }
    return { ...where, tenantId };
}
async function findAllForTenant(repo, tenantId, alias = 'e') {
    const qb = repo.createQueryBuilder(alias);
    applyTenantFilter(qb, alias, tenantId);
    return qb.getMany();
}
//# sourceMappingURL=tenant-aware.repository.js.map