# Phase 160 — Tenant Migration Foundation

Multi-tenant data layer foundation. Adds `tenantId` to all hot entities,
backfills the default `tr` tenant, ships a repository filter helper, and
sets the stage for service-by-service rollout in phases 161+.

## Hot Entity Map (18 entries)

| # | Entity | Table | Tenant-scoped? | Notes |
|---|--------|-------|----------------|-------|
| 1 | User | `users` | ✅ | per-tenant userbase |
| 2 | Job | `jobs` | ✅ | feed isolation |
| 3 | Booking | `bookings` | ✅ | per-tenant calendar |
| 4 | Offer | `offers` | ✅ | inherits Job's tenant |
| 5 | Review | `reviews` | ✅ | inherits Job's tenant |
| 6 | ChatMessage | `chat_messages` | ✅ | DM scope |
| 7 | Notification | `notifications` | ✅ | per-tenant inbox |
| 8 | ServiceRequest | `service_requests` | ✅ | feed isolation |
| 9 | ServiceRequestApplication | `service_request_applications` | ✅ | inherits SR's tenant |
| 10 | JobQuestion | `job_questions` | ✅ | inherits Job's tenant |
| 11 | JobQuestionReply | `job_question_replies` | ✅ | inherits Q's tenant |
| 12 | FavoriteWorker | `favorite_workers` | ✅ | per-user, scoped |
| 13 | SavedJob | `saved_jobs` | ✅ | per-user, scoped |
| 14 | FavoriteProvider | `favorite_providers` | ✅ | per-user, scoped |
| 15 | BlogPost | `blog_posts` | ✅ | per-tenant content |
| 16 | CategorySubscription | `category_subscriptions` | ✅ | per-user, scoped |
| 17 | AdminAuditLog | `admin_audit_logs` | ✅ | per-tenant admin trail |

**Global tables (NOT tenant-scoped):**
Category, SystemSetting, Tenant, Currency, OnboardingSlide, Provider catalog
shared resources, etc. Shared across tenants by design.

## Migration Strategy

### Dev (`synchronize: true`)
TypeORM auto-adds `tenantId` columns on next boot. The default tenant is
seeded by `TenantsService.onModuleInit` (slug='tr'). To populate existing
rows run the migration manually:

```bash
cd nestjs-backend
npm run typeorm migration:run
```

### Production (`synchronize: false`)
Standard migration:
1. Deploy code with new entity columns + migration file.
2. Migration runs in order: ADD COLUMN → backfill default tenant id →
   create composite indexes.
3. Verify backfill: `SELECT COUNT(*) FROM jobs WHERE tenantId IS NULL`
   should be 0.
4. Phase 161+ flips reads to tenant-filtered repository helpers.
5. Once stable, follow-up migration sets columns NOT NULL.

## Index Strategy

Each hot table gets a composite index `(tenantId, createdAt)` matching
the dominant query pattern (per-tenant feed sorted by recency). This
reuses Phase 130's pattern of `(filter_col, sort_col)` composite indexes.

## Repository Filter Pattern

```ts
// nestjs-backend/src/common/tenant-aware.repository.ts
import { applyTenantFilter } from '../../common/tenant-aware.repository';

// Service usage example (sample refactor for JobsService.findAll)
async findAllForTenant(tenantId: string, status?: JobStatus) {
  const qb = this.jobRepo.createQueryBuilder('j');
  applyTenantFilter(qb, 'j', tenantId);
  if (status) qb.andWhere('j.status = :status', { status });
  qb.orderBy('j.createdAt', 'DESC');
  return qb.getMany();
}
```

The helper emits `WHERE (j.tenantId = :tenantId OR j.tenantId IS NULL)`.
The `IS NULL` clause is a transitional fallback for any rows not yet
backfilled — once production backfill is verified complete, the OR clause
can be dropped (drop in `applyTenantFilter` itself, ripple-free).

## Resolution Flow

```
Request → TenantMiddleware (Phase 120)
        → resolves tenant via X-Tenant-Slug | host | default('tr')
        → req.tenant attached
        → Service reads req.tenant.id, passes to repository helper
        → Repository emits tenant-filtered SQL
```

## Phase 161+ Rollout Plan

Service-by-service refactor. **Order chosen by blast radius (smallest first):**

| Phase | Service | Why |
|-------|---------|-----|
| 161 | BlogPost | low traffic, easy validation |
| 162 | AdminAuditLog | append-only, simple |
| 163 | Notifications | per-user, naturally scoped |
| 164 | Jobs + Offers + JobQuestions | core feed (biggest test) |
| 165 | ServiceRequests + Applications | parallel feed |
| 166 | Bookings | per-user calendar |
| 167 | Reviews | depends on Job/Booking |
| 168 | ChatMessage | DM, two-party |
| 169 | Favorites + Saved + CategorySubs | utility tables batch |
| 170 | Users | last; auth bootstrap depends on this |

Each phase: pull tenant from `req.tenant.id`, route every list/find through
the helper, add per-service tests with two seeded tenants, verify zero
cross-tenant leakage.

## Open Questions for Phase 161+

- **Cross-tenant admin operations** — super-admin queries need a "no filter"
  escape hatch. Already supported: passing `null` to `applyTenantFilter`
  skips the WHERE.
- **Auth/login** — `User.findByEmail` will need to scope to current tenant
  or fall through to global lookup. Designed in Phase 170.
- **Soft-delete interaction** — existing `deletedAt` filters compose with
  tenant filter via `andWhere`, no conflict.
