# Phase 130 — DB Performance Audit

## 1) Problem Analizi
Codebase 42 entity içeriyor; mevcut `@Index` dekoratörleri tek-kolon ve ağırlıklı olarak sekonder tablolarda (`sms_otps`, `password_reset_tokens`, `favorite_workers`, `availability_slots`, `admin_audit_logs.adminUserId/targetType`). Hot path'lerdeki çok-kolonlu sorgular (jobs feed, offers list, notifications badge, chat history, booking calendar, worker discovery) şu anda full table scan + filesort yapıyor. `synchronize:true` dev için yeterli ama prod migration zinciri sadece `Init` placeholder.

## 2) Veri Akışı (Hot Path'ler)
| Endpoint | Sorgu deseni |
|---|---|
| `GET /jobs` | `WHERE status=? AND deletedAt IS NULL ORDER BY createdAt DESC` |
| `GET /jobs?customerId=` | `WHERE customerId=? AND status=?` |
| `GET /jobs/:id/offers` | `WHERE jobId=? AND status='pending'` |
| `GET /offers/my` | `WHERE userId=? ORDER BY createdAt DESC` |
| `GET /bookings/my-as-*` | `WHERE customerId/workerId=? ORDER BY scheduledDate DESC` |
| `GET /notifications` | `WHERE userId=? ORDER BY createdAt DESC` |
| `GET /notifications/unread-count` | `WHERE userId=? AND isRead=false` |
| Chat `getHistory` | `WHERE (from=A AND to=B) OR (from=B AND to=A) ORDER BY createdAt` |
| `GET /admin/audit-logs` | `WHERE action=? AND createdAt BETWEEN ?` |
| `GET /users/workers` | `WHERE city=? AND isAvailable=true ORDER BY reputationScore DESC` |

## 3) Database Yapısı (Önerilen Index'ler)

| Tablo | Index | Tip | Amaç |
|---|---|---|---|
| jobs | (status, createdAt) | composite | feed sıralama |
| jobs | (customerId, status) | composite | kullanıcının ilanları |
| jobs | (deletedAt) | btree | soft-delete filter (Phase 60) |
| jobs | (categoryId, status) | composite | kategori filtresi |
| offers | (jobId, status) | composite | bir ilana ait pending teklifler |
| offers | (userId, status) | composite | "tekliflerim" |
| bookings | (customerId, scheduledDate) | composite | müşteri takvimi |
| bookings | (workerId, scheduledDate) | composite | usta takvimi |
| bookings | (status, createdAt) | composite | admin paneli |
| notifications | (userId, isRead, createdAt) | composite | feed + unread sayım |
| chat_messages | (from, to, createdAt) | composite | iki yönlü konuşma |
| chat_messages | (to, from, createdAt) | composite | OR-leg fallback |
| admin_audit_logs | (action, createdAt) | composite | filtreli liste |
| admin_audit_logs | (targetType, targetId) | composite | bir varlığın izi |
| users | (city, district, isAvailable) | composite | usta keşfi |
| users | (isAvailable, reputationScore) | composite | "öne çıkan ustalar" |
| reviews | (revieweeId, createdAt) | composite | public profil |
| service_requests | (status, createdAt) | composite | feed |
| service_requests | (userId, status) | composite | "ilanlarım" |

**Postgres-only follow-up:** `users.workerCategories` JSON kolonu için GIN index — SQLite'da JSON1 ext zayıf, atlandı.

## 4) Optimizasyonlar (Query iyileştirme)
- `JobsService.findAll` → `relations:['customer']` yerine `select` ile sadece gerekli kolonlar (avatar list view için).
- `getPublicProfile` zaten `Promise.all` paralelleştirilmiş (commit `983fe713`) — tutuldu.
- `OffersService.findMyOffers` → `relations:['job','job.customer']` çoğu listede `customer` gereksiz; lazy loaded olabilir.
- `NotificationsService.unreadCount` → COUNT yerine partial index ile kapsanabilir (Postgres-only).
- `ChatGateway.getHistory` → şu an muhtemelen `OR` ile iki yönlü query; iki ayrı query + merge daha iyi index kullanır.
- `Reviews.recalcRating` → her review insert'inde recompute yerine trigger ya da incremental update düşünülebilir (Phase 131+).
- N+1 risk noktaları: `admin/users` listesi review/job count'ları için subquery ya da `loadRelationCountAndMap`.

## 5) Güvenlik Riskleri
Index'ler write-amplification getirir (~%5-10 INSERT cost) — DoS yüzeyi minimal. Query-by-status gibi düşük-cardinality kolonlarda composite index, attacker'ın `?status=open` ile cheap full-scan tetikleme riskini kapatır.

## 6) Önerilen Kod
- `nestjs-backend/src/migrations/1746748800000-AddPerformanceIndexes.ts` — 19 composite/single index, idempotent (`IF NOT EXISTS`), reversible (`down()`).
- Çalıştırma (prod):
  ```
  npm run migration:run
  ```
- Dev: `synchronize:true` ile entity'lerden zaten oluşur — migration prod parite için tutuluyor.
