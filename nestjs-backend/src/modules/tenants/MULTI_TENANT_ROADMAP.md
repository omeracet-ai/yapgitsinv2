# Multi-Tenant Roadmap

Phase 120 sadece scaffold'dur. Tek instance birden fazla marka host edebilsin diye altyapı kuruldu, ama veriler henüz tenant'a göre fiilen izole değil.

## Tamamlanan (Phase 120)

- `Tenant` entity (`tenants` tablosu): slug, brandName, subdomain, customDomain, theme, defaultCurrency, defaultLocale.
- `TenantsService`: CRUD + `findBySlug` / `findBySubdomain` + default tenant seed (`slug=tr`, brand "Yapgitsin").
- `TenantMiddleware`: her request'te tenant tespiti — `X-Tenant-Slug` header > Host subdomain > default fallback. `req.tenant` set eder.
- Public endpoint: `GET /tenants/current` — frontend tema/brand alır.
- Super-admin endpoint'leri: `GET /super-admin/tenants`, `POST /super-admin/tenants`, `PATCH /super-admin/tenants/:id`.
- `UserRole.SUPER_ADMIN` enum değeri + `SuperAdminGuard`.

## Sıradaki Major Work (Phase v3 — Tam Multi-Tenancy)

1. **Schema migration:** Mevcut tüm tenant-aware entity'lere `tenantId varchar nullable` ekle: `User`, `Job`, `Offer`, `ServiceRequest`, `Booking`, `Review`, `Category`, `Notification`, `TokenTransaction`, `JobQuestion`, `LeadRequest`, `SubscriptionPlan`, `UserSubscription`, vb.
2. **Backfill:** Migration script — default tenant ID ile tüm mevcut row'ları güncelle.
3. **Repository filtreleme:** Her query'ye otomatik `tenantId = req.tenant.id` filter. Tercihen `@CurrentTenant()` decorator + interceptor ile baseService pattern.
4. **Frontend tenant context:** Admin panel + Flutter — `/tenants/current` çağır, theme/brand override (logo, primary color, currency formatting, locale).
5. **Cross-tenant data leak audit:** Test suite — bir tenant'ın user'ı başka tenant'ın job'una erişemez.
6. **Subdomain DNS + reverse proxy:** Production'da `*.yapgitsin.app` wildcard cert + Host header forwarding.
7. **Tenant-bazlı pricing & billing:** SaaS plan entity, fatura emisyonu tenant başına.
8. **Tenant-aware uploads:** `uploads/<tenantId>/...` ile dosya izolasyonu.

## Tenant Resolution Stratejisi

```
1. X-Tenant-Slug header  (dev/test/SDK)
2. Host header
   a. customDomain exact match (örn: isegemen.az)
   b. subdomain.tld → ilk kısmı slug olarak dene (örn: az.yapgitsin.app → slug "az")
3. Default tenant (slug='tr')
```

Multi-tenant DB stratejisi: **shared DB + tenant_id discriminator** (silverbullet pattern). Schema-per-tenant veya DB-per-tenant overhead'i şu ölçek için gereksiz.
