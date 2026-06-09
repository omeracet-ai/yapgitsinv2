# Yapgitsin × Yaprakzade — SaaS Modül Entegrasyon Planı

Hedef: Yaprakzade admin'inde çalışan **fonksiyonel** SaaS araçlarını Yapgitsin'in NestJS + Next.js + SQLite mimarisine entegre etmek. Salt fonksiyon haritası — kod yok.

**Önemli:** `PORT_EXECUTION_PLAN.md` Faz A-F (görsel port) bitmeden bu plandaki hiçbir adım koda dökülmez. Bu plan **Faz G+** olarak sıralanır.

Kaynak: `D:/masaüstü/Yaprakzade/admin/` (54 PHP dosya tarandı).

---

## 1. Yaprakzade SaaS Modül Envanteri

| # | Modül | Yaprakzade dosyası | Amacı (1 cümle) | DB ihtiyacı | External servis | Anlık/Cron/Queue |
|---|---|---|---|---|---|---|
| 1 | AI Operations Assistant | `ai-assistant.php`, `api/ai-chat.php` | Mod tabanlı sohbet (SEO/blog/landing/ürün/kurumsal/analitik/trafik/günlük rapor) + 7-rol sistem prompt | chat_messages (yok) | Gemini 2.5 Flash (256 token) | Anlık |
| 2 | 404 Monitor | `404-monitor.php` | 404 logla + redirect rule yönetimi (modal'dan satır ekle) | notfound_log, redirects | — | Anlık (her 404 hit) |
| 3 | Audit Log | `audit-log.php` | Tüm admin aksiyonları timeline + stats + purge | audit_log | — | Anlık |
| 4 | Backups | `backups.php` | DB snapshot create/list/download/delete + restore | (filesystem) | — | Manuel + Cron daily |
| 5 | Blog CMS | `blog.php` | Post CRUD + pillar select + sort | blog_posts | — | Anlık |
| 6 | Bundles | `bundles.php` | Ürün paket bundle'ı (kapak + içindekiler) | bundles, bundle_items | — | Anlık |
| 7 | Campaigns | `campaigns.php` | Promo kampanya (flash, first_order, seasonal) %-indirim window | campaigns | — | Cron (expiry check) |
| 8 | Categories | `categories.php` | Kategori CRUD + hero image + schema | categories | — | Anlık |
| 9 | City Landings (programmatic SEO) | `city-landings.php`, `api/city-landings-generate.php` | 81 il × 3 niş = 243 landing template | city_landings | — | Toplu üretim (manuel buton) |
| 10 | Content Engine | `content.php` | `contents` tablosu key/value CMS — tüm site metinleri tek yerde, sekmeli editör | contents | — | Anlık |
| 11 | Coupons | `coupons.php` | Kupon kod CRUD + per-customer 1-kerelik gate | coupons | — | Anlık |
| 12 | Cron Hub | `cron-hub.php` | Tüm cron URL'leri tek panel — copy-to-clipboard + cron-job.org talimatı | (config) | cron-job.org (external user setup) | Görüntü |
| 13 | Customers | `customers.php` | Müşteri liste + tier (silver/gold) + fraud_score + loyalty | customers | — | Anlık |
| 14 | DNS Health | `dns-health.php` | SPF/DKIM/DMARC/MX/A/NS canlı DNS query + skor | (yok) | dns_get_record() | Anlık (no-cache) |
| 15 | EEAT | `eeat.php` | Üretim adımları + sertifika + lab + ekip 4 sekme | eeat_production, eeat_certifications, eeat_lab, eeat_team | — | Anlık |
| 16 | Admins (kullanıcı) | `admins.php` | Owner+admin user CRUD | admin_users, admin_roles | — | Anlık |
| 17 | FAQ | `faq.php` | SSS CRUD + kategori + featured | faqs | — | Anlık |
| 18 | Finance | `finance.php` | Gelir/gider raporu + KPI + CSV export + ürün performans | orders, order_items, products (SELECT only) | — | Anlık |
| 19 | Formula Suggestions | `formula-suggestions.php` | Müşteri harman önerilerini moderate et → ürüne dönüştür | user_formula_suggestions | WhatsApp notify | Anlık |
| 20 | Fraud Panel | `fraud.php` | 5 KPI + fraud_score 0-100 + 7 aksiyon (freeze/recalc/cancel-coupons/sybil-mass-freeze) | customers, customer_ip_events, abuse_throttle | — | Manuel + cron daily 03:15 |
| 21 | Gallery | `gallery.php` | Görsel galeri CRUD + sort | gallery | — | Anlık |
| 22 | GSC Dashboard | `gsc-dashboard.php`, `api/gsc-fetch.php` | Google Search Console 4 KPI + trend + top queries/pages + quick wins + falling | gsc_dash_cache (1h TTL) | Google Search Console API | Anlık (cache) |
| 23 | Keyword Finder | `keyword-finder.php` | GSC 90g impr>100 & pos>11 → AI blog taslağı | (md dosya: blog_drafts/) | GSC + Gemini | Manuel batch |
| 24 | Landings | `landings.php` | Manuel landing CRUD (otel-cayi vs.) | landing_pages | — | Anlık |
| 25 | Login Attempts | `login-attempts.php` | Brute-force görünürlük — son 24s 5+ fail IP | login_attempts | — | Anlık |
| 26 | Loyalty | `loyalty.php` | Puan tablosu + tier (silver/gold) + günlük cron | loyalty_transactions, customers.points | — | Cron daily |
| 27 | Menu (sidebar) | `menu.php`, `sidebar-items.php` | Public nav + admin sidebar item CRUD + drag-drop | menu_items, admin_nav_items | — | Anlık |
| 28 | Message Log | `message-log.php` | Tüm giden mail/WhatsApp/SMS logu | message_log | — | Anlık |
| 29 | Orders | `orders.php` | Sipariş yönetimi + status transition + müşteri WA notify | orders, order_items | WhatsApp | Anlık |
| 30 | Pillars (SEO) | `pillars.php` | 5 pillar topic + cluster blog auto-generate (Gemini) | pillar_pages | Gemini | Manuel batch |
| 31 | Price Tool | `price-tool.php` | Ürün maliyet/satış fiyat hesaplayıcı + KDV + kar marjı | products (SELECT) | — | Anlık |
| 32 | Products | `products.php` | Ürün CRUD + 8+ kolon | products, product_images | — | Anlık |
| 33 | Quality Check | `quality-check.php` | İçerik/URL hijyen denetleyicisi — eksik slug/title/img sayar | tüm tablolar (SELECT) | — | Anlık |
| 34 | Quiz Recommender | `quiz.php` | Soru-cevap → ürün önerisi + lead + QUIZ-XXXX kupon | quiz_questions, quiz_answers, quiz_submissions | — | Anlık |
| 35 | RBAC Matrix | `rbac.php` | Rol × yetki matrisi hücre toggle | admin_roles, admin_permissions, role_permissions | — | Anlık |
| 36 | References | `references.php` | Kurumsal referans CRUD (logo grid) | references | — | Anlık |
| 37 | Reviews | `reviews.php` | Ürün yorumu moderasyonu | reviews | — | Anlık |
| 38 | SEO Audit | `seo-audit.php` | CLI script include + tüm sayfa title/desc/canonical denetimi + cache | seo_audit_cache | — | Manuel + cron |
| 39 | SEO Stats (GA4) | `seo-stats.php`, `seo-stats-callback.php` | GA4 OAuth + dashboard | (oauth token) | GA4 | Anlık (cache) |
| 40 | Settings | `settings.php` | Teknik ayar (SMTP, uyarı eşiği, key/value) | app_settings | — | Anlık |
| 41 | Showcase (Sinematik) | `showcase.php` | 5 sahne CRUD + drag-drop + video upload (5MB) | showcase_scenes | — | Anlık |
| 42 | Sliders | `sliders.php` | Hero slider CRUD + CTA + bg overlay | sliders | — | Anlık |
| 43 | Splash | `splash.php` | Splash banner — test modu + IP-istatistik | splash_banner | — | Anlık |
| 44 | Subscription Plans | `subscription-plans.php` | 4 plan + aylık kutu içerik (JSON) | subscription_plans, monthly_boxes | — | Anlık |
| 45 | Subscriptions | `subscriptions.php` | Aktif abonelik + pause/resume/cancel | subscriptions | — | Cron renewal |
| 46 | Trust Items | `trust-items.php` | Güven şeridi CRUD | trust_items | — | Anlık |
| 47 | Toggle API | `toggle.php` | Inline AJAX is_active toggle (whitelist tablo) | — | — | Anlık |

---

## 2. Yapgitsin'de Eşleşme Matrisi

### Zaten var (Faz D'de görsel port ediliyor — fonksiyonel atla)
| Yaprakzade modül | Yapgitsin karşılığı | Not |
|---|---|---|
| Audit Log (3) | `/audit-log` | Phase 33/36 — stats + purge + CSV export tam var |
| Categories (8) | `/categories` | CRUD tam |
| Content Engine (10) | `/ayarlar` + `/admin/settings/*` | Yapgitsin'de key/value generic, Yaprakzade kadar sekmeli değil; UI farkı |
| Coupons (11) | `/promo-codes` | Mevcut |
| Customers (13) | `/users` | User entity tek; tier/loyalty alanı yok |
| Admins (16) | `/users` (role admin) | RBAC yok, sadece role enum |
| Finance/Revenue (18) | `/revenue` | KPI özet var, detay tablo + CSV YOK |
| Login Attempts (25) | `/blocked-ips` + audit | Brute-force panel ayrı yok ama IP block var |
| Menu/Sidebar (27) | `(admin)/layout.tsx` NAV | Hardcoded, DB-driven değil |
| Message Log (28) | `/admin/notifications/broadcast/history` | Sadece broadcast, tüm mesaj log yok |
| Orders (29) | yok — marketplace farklı | Yapgitsin'de "Order" yok, `Booking`/`Job` var |
| Quality Check (33) | yok | — |
| RBAC (35) | yok | Sadece role: user/admin enum |
| References (36) | yok | — |
| Reviews (37) | `/moderation` (review tab) | Var |
| Settings (40) | `/ayarlar` | Var |

### Yarı var (backend var, UI eksik veya tersi)
| Yaprakzade modül | Yapgitsin durumu | Eksik taraf |
|---|---|---|
| AI Assistant (1) | `AIAssistantPanel` topbar trigger var, generic değil | Mod tabanlı (SEO/blog/analitik) sohbet UI — sadece config diff'e bağlı şu an |
| Backups (4) | `/admin/backup/*` endpoint + apk-icerik tab var | Tam sayfa UI ve cron schedule UI yok (Phase 273 var ama yarım) |
| Blog CMS (5) | `/blog`, `/blog/new`, `/blog/edit/[id]` var ama NAV gizli | Aktive et + Yaprakzade pillar field |
| Loyalty (26) | tokenBalance var, tier yok | Tier (silver/gold) + loyalty_transactions logu |
| FAQ (17) | yok | Yeni eklenebilir, marketplace için anlamlı |
| Trust Items (46) | yok | — |
| Toggle API (47) | Tek tek endpoint'ler (verify/featured) | Generic whitelist endpoint yok |

### Hiç yok, port edilecek (Yapgitsin için anlamlı)
| Yaprakzade modül | Sebep |
|---|---|
| 404 Monitor (2) | SEO için Yapgitsin marketing/landing URL'leri için anlamlı |
| Cron Hub (12) | Yapgitsin'de zaten cron var (loyalty/cleanup) — tek panelden URL listesi pratik |
| DNS Health (14) | Email deliverability Yapgitsin için kritik (FCM token + notification email) |
| GSC Dashboard (22) | yapgitsin.tr public marketing site var; SEO görünürlüğü gerekli |
| Keyword Finder (23) | GSC bağlantısı varsa direkt çalışır — marketing content fırsat çıkarır |
| Pillars (30) | Marketing blog için (29 hizmet kategorisi × pillar mimarisi anlamlı) |
| Quality Check (33) | Yapgitsin'de eksik kategori icon/desc kontrolü için |
| RBAC (35) | Müdür/sub-admin ayrımı için — büyüdükçe gerekecek |
| SEO Audit (38) | Marketing site için |
| SEO Stats / GA4 (39) | Var olan analytics'i GA4 ile eşle |
| Message Log (28) | Tüm giden FCM + email + WA logu — debug + audit |

### Port etme (Yapgitsin marketplace bağlamına uygun değil)
| Yaprakzade modül | Sebep |
|---|---|
| Bundles (6) | E-com ürün paketi — Yapgitsin hizmet marketplace, ürün yok |
| Campaigns (7) | Flash %20 indirim — Yapgitsin'de Promo Codes zaten kapsar |
| City Landings (9) | 243 il landing — Yapgitsin marketing için anlamlı ama **Faz G değil Faz I**, ayrı düşün |
| EEAT (15) | E-com Türkiye trust elements — Yapgitsin için identityVerified zaten kapsar |
| Formula Suggestions (19) | Çay harmanı özel | Yapgitsin'de muadili yok |
| Gallery (21) | Yapgitsin'de Job/Provider fotoğrafları var, generic galeri gereksiz |
| Orders (29) — direkt | Marketplace = Job/Booking, alışveriş değil |
| Price Tool (31) | Ürün maliyet hesaplayıcı — Yapgitsin'de pricing AI var (komisyon ayrı UI) |
| Products (32) | Ürün yok |
| Quiz (34) | Çay quiz; Yapgitsin için onboarding farklı (zaten /onboarding-mgmt) |
| Showcase (41) | Cinematic vitrin e-com'a özgü |
| Sliders (42) | Yapgitsin web'de slider yok; mobil splash zaten /apk-* |
| Splash (43) | Splash banner — Yapgitsin'de var (Phase 269+) |
| Subscription Plans (44) | Yapgitsin token sistemi farklı (5 token/teklif), abonelik konsepti yok |
| Subscriptions (45) | Aynı |
| Fraud Panel (20) | Yapgitsin'de bot-protection + blocked-ips var; sybil/IP-fraud port etmek için **basit varyant** Faz I'de düşün |

---

## 3. Yeni eklenecek SaaS modüller (Yapgitsin için anlamlı)

### M1 — AI Operations Assistant (mod tabanlı)

- **Amaç:** Admin'in tek panel üzerinden marketplace metrik + içerik + SEO sorularını AI'a sorması (mevcut `AIAssistantPanel` config diff'e bağlı; generic chat eksik).
- **Backend:**
  - Yeni entity: `AdminChatMessage` (`id`, `sessionId`, `role: user|assistant`, `content`, `mode: seo|blog|content|analytics|support|general`, `createdAt`)
  - Yeni endpoint: `POST /admin/ai/chat { sessionId, mode, message, history? }` → `{ reply, sessionId }`. Mevcut `GeminiClient` reuse. System prompt mod'a göre seçilir (`prompts/admin-{mode}.txt`).
  - Cron: yok.
- **Admin UI:** `/ai-assistant` (yeni sidebar grup "AI Araçları"). Mevcut topbar AIAssistantPanel'i bu sayfaya genişlet. `AdCard` + chat stream + `AdInput` textarea + mode pills (8 mod).
- **Migrate adımları:**
  1. Entity + migration `015_admin_chat_messages.sql`
  2. `/admin/ai/chat` controller + service (system prompt seçim)
  3. `/ai-assistant` sayfa (8 mode pill + stream UI)
  4. Sidebar NAV entry
  5. Smoke: 1 prompt → reply
- **Risk:** Gemini quota — per-admin throttle (mevcut `ai.service` paterni: 10/dk).
- **Bağımlılık:** Faz D bitmiş olmalı (`AdCard`/`AdInput` hazır).

### M2 — 404 Monitor + Redirect Rules

- **Amaç:** yapgitsin.tr web sitesinin 404 isabetlerini topla + admin'den redirect kuralı ekle. SEO juice kaybı önler.
- **Backend:**
  - Entity: `NotFoundLog` (`id`, `url`, `hitCount`, `ipHash sha256+salt`, `lastSeenAt`)
  - Entity: `Redirect` (`id`, `src` unique, `dst`, `status 301|302`, `hits`, `createdAt`)
  - Endpoint: `POST /404 { url }` (public) — log hit, hit_count++ on duplicate
  - Endpoint: `GET /admin/404-monitor?days=30`, `POST /admin/redirects {src,dst,status}`, `DELETE /admin/redirects/:id`
  - Web tarafı: Next.js `not-found.tsx` içinden POST + middleware'de `redirects` tablosu lookup
- **Admin UI:** `/seo-404` — `AdTable` (URL + hit count + last seen) + modal "Redirect ekle"
- **Migrate adımları:** entity → controller → public 404 endpoint → middleware → admin page
- **Risk:** Public POST flood — IP throttle (mevcut Throttler).
- **Bağımlılık:** yapgitsin.tr web'in Next.js middleware'i değişecek.

### M3 — GSC Dashboard

- **Amaç:** Google Search Console verisini admin'de gör. 4 KPI + 30g trend + top 20 query/page + quick wins (pos 4-15) + falling.
- **Backend:**
  - Entity: `GscCache` (`id`, `key`, `payload simple-json`, `expiresAt`) — 1h TTL
  - Endpoint: `GET /admin/seo/gsc?days=7|30|90` — cache check → GSC API (`searchanalytics/query`)
  - Env: `GSC_SERVICE_ACCOUNT_JSON_PATH` veya `GSC_REFRESH_TOKEN`
  - Cron: yok (lazy fetch)
- **Admin UI:** `/seo-gsc` — `AdStat` × 4 + Recharts trend + `AdTable` × 4
- **Migrate adımları:** GSC service account setup → entity → fetch service → endpoint → page
- **Risk:** GSC API quota (50K/gün, yeterli); OAuth refresh token kaybolursa manual reauth gerekir.
- **Bağımlılık:** Google Cloud project + Service Account.

### M4 — Keyword Finder (GSC + Gemini)

- **Amaç:** GSC 90g'de impression>100 ama position>11 olan sorgular için Gemini ile blog taslağı üret. Marketing content fırsatı yakalama.
- **Backend:**
  - Endpoint: `POST /admin/seo/keyword-drafts { query }` → Gemini taslak (markdown) → dosyaya kaydet `_drafts/<slug>-<date>.md` veya `BlogDraft` entity
  - Entity: `BlogDraft` (`id`, `query`, `slug`, `markdown`, `gscPosition`, `gscImpressions`, `status: draft|published`, `createdAt`)
  - Endpoint: `GET /admin/seo/keyword-opportunities` — GSC fırsat listesi (cache reuse)
- **Admin UI:** `/seo-keywords` — `AdTable` fırsat listesi + "Taslak Üret" `AdButton` → `AdModal` markdown önizleme
- **Migrate adımları:** GSC fetch (M3 bağımlı) → Gemini prompt → entity → page
- **Bağımlılık:** **M3 bitmiş olmalı.**

### M5 — Pillars + Cluster Content (SEO mimari)

- **Amaç:** 29 kategori için pillar sayfa + cluster blog auto-generate (Gemini). Yapgitsin yapgitsin.tr/hizmet/<slug> sayfalarının SEO derinliğini artırır.
- **Backend:**
  - Entity: `PillarPage` (`id`, `slug`, `title`, `topic`, `content text`, `clusterPostIds simple-json`, `seoMetaTitle`, `seoMetaDesc`)
  - Endpoint: `GET/POST/PATCH /admin/pillars`, `POST /admin/pillars/:id/generate-clusters { count }` → Gemini batch
  - Cron: yok (manual batch)
- **Admin UI:** `/seo-pillars` — `AdTable` pillar listesi + "Cluster Üret" butonu
- **Migrate adımları:** entity → CRUD endpoint → Gemini batch service → page
- **Risk:** Gemini 15 RPM free tier — batch'i 4sn rate limit.
- **Bağımlılık:** yapgitsin.tr web'de `/pillar/<slug>` route gerekli.

### M6 — Quality Check Dashboard

- **Amaç:** Veri hijyeni denetleyicisi — eksik kategori icon, açıklama yok, slug duplicate, kullanıcı `profileImageUrl` eksik, vs.
- **Backend:**
  - Endpoint: `GET /admin/quality-check` → 5-10 sorun türü, her biri `{type, severity, count, sample[], fixUrl}`
  - Salt SELECT — yazma yok
- **Admin UI:** `/quality-check` — Severity şerit (red/yellow/green KPI) + `AdTable` problem listesi
- **Migrate adımları:** controller + service (kategori/user/job/SR/category sorgular) → page
- **Risk:** Yok (read-only).
- **Bağımlılık:** yok.

### M7 — DNS Health (Email Deliverability)

- **Amaç:** SPF/DKIM/DMARC/MX canlı kontrol. Yapgitsin notification email + Resend pipeline için kritik.
- **Backend:**
  - Endpoint: `GET /admin/dns-health?domain=yapgitsin.tr` — Node `dns.promises.resolveTxt/Mx/Ns/A` ile fetch + skor
  - Cache yok (no-cache, her açılış canlı)
- **Admin UI:** `/dns-health` — `AdCard` × 6 (SPF/DKIM/DMARC/MX/A/NS) + skor şeridi + kopyala butonları
- **Migrate adımları:** service (DNS resolve helpers) → controller → page
- **Risk:** Plesk DNS resolver bazen yavaş — timeout 5s.
- **Bağımlılık:** yok.

### M8 — Message Log (giden mail + FCM + WA)

- **Amaç:** Tüm giden mesajların (email + FCM push + WA) merkezi log'u — debug + audit + retry.
- **Backend:**
  - Entity: `MessageLog` (`id`, `channel: email|fcm|wa|sms`, `to`, `subject`, `body`, `status: pending|sent|failed`, `error?`, `meta simple-json`, `createdAt`)
  - Mevcut email/FCM service'lere log INSERT eklenir (interceptor pattern).
  - Endpoint: `GET /admin/messages?channel&status&page`, `POST /admin/messages/:id/retry`
  - Cron: nightly purge (>30 gün)
- **Admin UI:** `/messages` — `AdTable` paginated + filter (channel + status) + detail modal
- **Migrate adımları:** entity → service hook'ları (Resend + Firebase Admin + WA caller) → controller → page → cron
- **Risk:** Volume — saatte 1000+ FCM push olursa DB şişer; bu yüzden 30g retention.
- **Bağımlılık:** mevcut email/FCM service'ler refactor edilmeli (interceptor).

### M9 — Cron Hub (görüntü panel)

- **Amaç:** Tüm cron endpoint URL'lerini tek panelden kopyala. Yeni admin için onboarding kolaylığı.
- **Backend:**
  - Endpoint: `GET /admin/cron-hub` → hardcoded array (name, url, frequency, phase, status_url)
  - Yapgitsin cron'ları: backup daily, blocked-ips cleanup, FCM retry, audit purge, M8 message purge
- **Admin UI:** `/cron-hub` — `AdCard` listesi + clipboard button
- **Migrate adımları:** endpoint → page → array sabitleri
- **Risk:** yok.
- **Bağımlılık:** yok.

### M10 — Loyalty Tier (Müşteri sadakat)

- **Amaç:** Müşteri/Usta'ya tier (bronze/silver/gold/platinum) + ödül noktası ekle. Token sistemi var ama tier yok.
- **Backend:**
  - User entity'ye eklenir: `tier varchar default 'bronze'`, `loyaltyPoints integer default 0`, `lifetimeSpend float default 0`
  - Entity: `LoyaltyTransaction` (`id`, `userId`, `type: earn|redeem|bonus`, `points`, `reason`, `meta`, `createdAt`)
  - Endpoint: `POST /admin/loyalty/grant {userId, points, reason}`, `GET /admin/loyalty/leaderboard`
  - Cron: daily recompute tier (lifetimeSpend threshold)
- **Admin UI:** `/loyalty` — leaderboard `AdTable` + grant `AdModal`
- **Migrate adımları:** User patch (3 sütun) → LoyaltyTx entity → controller + cron → page
- **Risk:** Mevcut token sistemiyle karışmasın — tier ayrı, token bakiyesi ayrı.
- **Bağımlılık:** yok.

### M11 — RBAC Matrix (rol × yetki)

- **Amaç:** Müdür/sub-admin/moderatör rolleri için fine-grained permission. Tek admin senaryosundan çoklu admin'e geçiş.
- **Backend:**
  - Entity: `AdminRole` (`id`, `name`, `isOwner`), `AdminPermission` (`id`, `module`, `action`), `RolePermission` (`roleId`, `permissionId`)
  - User.role string → `adminRoleId FK` (migrate path)
  - Guard: `@RequirePermission('jobs.write')` decorator
  - Endpoint: `GET/POST/PATCH /admin/roles`, `POST /admin/roles/:id/permissions/toggle`
- **Admin UI:** `/rbac` — matrix table (rol × yetki hücre toggle)
- **Migrate adımları:** entities → seed (owner all-perms) → guard decorator → mevcut controller'lara perm ekle (40+ method, 1 günlük iş) → page
- **Risk:** Mevcut `admin@yapgitsin.tr` owner olarak migrate edilmeli, regresyon riski yüksek.
- **Bağımlılık:** **Faz I sonu**, görsel port tamamen bitmeden başlanmamalı.

---

## 4. External servis entegrasyonları

| Servis | Yaprakzade kullanım | Yapgitsin durumu | Karar |
|---|---|---|---|
| **Gemini 2.5 Flash** | Tüm AI (chat/blog/pillar/keyword/draft) | Phase 281 — tüm `/ai/*` Gemini'ye taşındı. `GeminiClient` yerinde. | Reuse — admin AI Assistant (M1) + Keyword Finder (M4) + Pillars (M5) aynı client kullanır. Per-admin throttle: 10/dk. |
| **GA4** | seo-stats.php — OAuth + dashboard | Yapgitsin'de yok (web tarafında embed olabilir) | Düşük öncelik. Admin'e GA4 OAuth dashboard ekle (Faz I). Public web'de zaten GA4 var (`NEXT_PUBLIC_GA4_ID`). |
| **Google Search Console (GSC)** | gsc-dashboard + keyword-finder | Yok | M3 + M4 için zorunlu. Service Account JSON setup (Google Cloud Console). |
| **IndexNow** | api/indexnow.php (Bing/Yandex/Seznam/Naver) | Yok | Yapgitsin marketing içeriği güncelleninceye kadar atla. yapgitsin.tr Next.js static export — `revalidate` zaten yapıyor. IndexNow nice-to-have, **Faz I**. |
| **Resend SMTP** | DKIM verified, primary | Yapgitsin'de email pipeline kullanıyor (memory: "prod sends via Resend SMTP"). | Aynı pipeline — M8 Message Log Resend webhook'larını da yakalar. |
| **Sentry** | Yok (Yaprakzade'de yok) | `SentryInit` admin panel'de var. | Devam, dokunma. |
| **WhatsApp (cloud_api/callmebot)** | wa_send.php | Yapgitsin'de yok (FCM kullanılıyor) | Port etme — Yapgitsin push FCM ile çalışıyor, WA ikinci kanal gereksiz. |
| **Cron-job.org / EasyCron** | External scheduler (Plesk shared host) | Yapgitsin'de `@nestjs/schedule` var | Yapgitsin'de NestJS @Cron decorator yeterli; cron-hub sayfası bilgilendirme. |
| **DNS resolver** | dns_get_record() PHP | Node `dns.promises` | M7 için doğal eşleşme. |

---

## 5. Sıralı uygulama planı (Faz G, H, I)

**ÖN KOŞUL:** `PORT_EXECUTION_PLAN.md` Faz A-F (görsel) tamamen bitmiş, deploy edilmiş, smoke geçmiş olmalı. Çakışma riskini sıfırlamak için.

### Faz G — En kritik 2 modül (4-6 saat, 4 commit)

| # | Modül | BE iş | UI iş | Süre |
|---|---|---|---|---|
| M1 | AI Operations Assistant (generic chat) | entity + endpoint + system prompts | yeni `/ai-assistant` sayfa | 2h |
| M6 | Quality Check | salt SELECT controller | `/quality-check` sayfa | 1.5h |
| M9 | Cron Hub | static array endpoint | `/cron-hub` sayfa | 1h |

**Sebep:** M1 admin productivity'yi hemen artırır. M6 + M9 risk-free, hızlı win. Bağımlılık yok.

**Commit'ler:**
- `feat(phase-G1): admin AI Operations Assistant — generic mode-based chat`
- `feat(phase-G2): admin quality-check dashboard`
- `feat(phase-G3): admin cron-hub viewer`

### Faz H — Orta öncelik 3 modül (8-10 saat, 5 commit)

| # | Modül | BE iş | UI iş | Süre |
|---|---|---|---|---|
| M7 | DNS Health | DNS resolve service + endpoint | `/dns-health` sayfa | 1.5h |
| M2 | 404 Monitor + Redirects | 2 entity + 4 endpoint + web middleware | `/seo-404` sayfa + modal | 2.5h |
| M8 | Message Log | entity + 3 service'e log hook + endpoint + cron | `/messages` sayfa | 3h |
| M10 | Loyalty Tier | User patch (3 col) + LoyaltyTx + cron | `/loyalty` sayfa | 2h |

**Sebep:** Operasyon ve veri tarafı temizliği. M8 özellikle FCM debug için kritik.

**Commit'ler:** 5 ayrı (her modül ayrı commit + LoyaltyTier 2 commit BE/FE).

### Faz I — Nice-to-have + büyük taahhüt (12-16 saat, 6 commit)

| # | Modül | BE iş | UI iş | Süre |
|---|---|---|---|---|
| M3 | GSC Dashboard | GSC OAuth + service + cache entity + endpoint | `/seo-gsc` sayfa (4 KPI + trend + 4 tablo) | 4h |
| M4 | Keyword Finder | GSC reuse + Gemini batch + BlogDraft entity | `/seo-keywords` sayfa | 2h |
| M5 | Pillars + Cluster | PillarPage entity + Gemini batch + web route | `/seo-pillars` sayfa | 3h |
| M11 | RBAC Matrix | 3 entity + guard decorator + 40+ controller patch | `/rbac` matrix UI | 5h |

**Sebep:** RBAC mevcut auth'u değiştirir, regression riski yüksek — en sona. SEO stack (M3/M4/M5) Yapgitsin pazarlama büyüdükçe değerlenir.

**Commit'ler:** 6 ayrı (GSC 1, KW 1, Pillars 1, RBAC 3 — entity/guard/page).

### Toplam tahmini

| Faz | Süre | Commit | BE/UI oranı |
|---|---|---|---|
| G | 4-6h | 3 | 50/50 |
| H | 8-10h | 5 | 60/40 |
| I | 12-16h | 6 | 65/35 |
| **Toplam (Faz A-F sonrası)** | **24-32h** | **14** | **~60/40** |

---

## 6. Mimari kararlar

### Yaprakzade PHP → Yapgitsin NestJS karşılığı
| Yaprakzade pattern | Yapgitsin pattern |
|---|---|
| `require __DIR__ . '/includes/header.php'` | `(admin)/layout.tsx` shell |
| `db()->prepare()->execute()` (PDO) | TypeORM Repository |
| `setting('key')` (contents tablo) | `app_settings` tablo + `AppConfig` entity |
| `c('key', $default)` (içerik motoru) | Yapgitsin'de eşdeğer yok — generic `/admin/settings/:key` zaten kapsar |
| `admin_page_title('icon', 'title', 'tip')` | sayfa `<h1>` + `info_tip` benzeri tooltip component |
| `current_admin()` auth gate | `AdminGuard` + `@CurrentUser()` |
| `audit_log($action, $entity, $id, $meta)` | `AuditLogService.log()` (mevcut) |
| Inline AJAX `toggle.php?table=X&id=Y` | Per-resource PATCH endpoint (mevcut paterni koru) |
| `setting('cron_token')` URL koruması | NestJS @Cron decorator (token gerek yok — internal scheduler) |

### MySQL → SQLite (TypeORM) farkları
- MySQL `ADD COLUMN IF NOT EXISTS` (8.0+) → TypeORM `synchronize: true` + migration `INFORMATION_SCHEMA` check
- MySQL `JSON` → SQLite `simple-json`
- MySQL `DECIMAL(10,2)` → SQLite `float`
- MySQL `DATETIME` → SQLite `datetime` (TypeORM zaten doğru map'liyor)
- MySQL `ENUM('a','b')` → SQLite `simple-enum`
- MySQL `FULLTEXT` index → SQLite FTS5 (gerekirse — şimdilik LIKE yeterli)

### Cron stratejisi
- **Yaprakzade:** cron-job.org external scheduler + token-gated URL
- **Yapgitsin:** `@nestjs/schedule` zaten kurulu (Phase 441). `@Cron(CronExpression.EVERY_DAY_AT_3AM)` decorator. External cron'a gerek yok.
- Cron Hub sayfası (M9) sadece **bilgilendirme** — gerçek cron NestJS scheduler'da çalışır.
- **Karar:** Yeni cron'lar `@Cron` ile yazılır. URL endpoint'i opsiyonel (manuel tetik için).

### Email pipeline
- Yaprakzade'nin "register_shutdown_function güvenilmez → synchronous" dersi Yapgitsin için **direkt geçerli**.
- Yapgitsin email service'i Resend SMTP üzerinden zaten synchronous. M8 Message Log INSERT'i de aynı request-cycle içinde yapılır (try/catch ile fail-safe).
- **Karar:** Async kuyruk **eklenmez**. Synchronous + try/catch + Message Log retry endpoint yeterli.

### Kuyruk (Bull/BullMQ)
- Yapgitsin volume'ü şu an düşük (saatte ~100 FCM tahmin). Kuyruk overhead'i değmiyor.
- Tek senaryoda gerekebilir: M5 Pillar cluster batch (10 blog × Gemini 4sn = 40sn). Bu **HTTP request scope'unda timeout'a girer**. Çözüm:
  - Opsiyon A: Background promise + admin'e "Tamamlandı bildirimi" (mevcut FCM ile)
  - Opsiyon B: `setImmediate()` + status polling endpoint
- **Karar:** **Kuyruk eklenmez**. M5 için Opsiyon B (status polling endpoint `GET /admin/pillars/:id/generation-status`).

---

## 7. Çakışma kontrolü

### `PORT_EXECUTION_PLAN.md` Faz A-F ile çakışma haritası

| Faz | Dokunduğu dosyalar | SaaS Faz G-I'nın eklediği dosyalar | Çakışma? |
|---|---|---|---|
| A | `globals.css` | Yeni sayfa class'ları (ad-* zaten var) | ❌ Yok |
| B | `(admin)/layout.tsx`, `AdminTopbar.tsx`, yeni `nav/` | Yeni NAV entry'leri (`/ai-assistant`, `/seo-*`, `/cron-hub`, `/messages`, `/loyalty`, `/quality-check`, `/dns-health`, `/seo-404`, `/rbac`) eklenir | ⚠️ **NAV array genişler** — Faz B layout.tsx rewrite sırasında SaaS NAV item'larını eklemek için ileride yeniden touch edilir. Çözüm: Faz B'de NAV array'ini `data/admin-nav.ts` gibi ayrı dosyaya çıkarmak — sonra SaaS modülleri sadece bu dosyayı update eder |
| C | `components/ad/*` yeni | SaaS sayfaları aynı component'leri kullanır | ❌ Yok |
| D | 26 mevcut sayfa class swap | Yeni sayfa ekleme (mevcutlarına dokunmaz) | ❌ Yok |
| E | Lucide ikon | SaaS NAV'larına yeni ikonlar eklenir (`MessageCircle`, `Globe`, `Award`, `Sparkles`, `BarChart3`, `Clock`, `AlertTriangle`, `Server`, `Shield`) | ❌ Yok (additive) |
| F | Savebar 4 sayfa | M1 AI sayfasında da savebar olur | ❌ Yok (pattern reuse) |

### Karar
- Faz B'de NAV array'i **mutlaka** `src/data/admin-nav.ts` dosyasına çıkarılmalı. Aksi halde her SaaS modül `layout.tsx`'i değiştirir (merge conflict riski).
- Faz G-I'da koda dokunmadan önce, Faz B sırasında oluşturulan `admin-nav.ts` dosyası gözden geçirilir; gruplar SaaS NAV item'ları için "AI Araçları", "SEO Araçları", "Sistem" gibi hazır olur.

### Görsel port'tan SONRA uygulama kuralı
- **YASAK:** Bu plan görsel port tamamen bitmeden koda dökülemez.
- Faz F commit'i merged + deploy edildikten sonra Faz G başlar.
- Her Faz G/H/I commit'i mevcut `Ad*` component lib'ini kullanır — yeni primitive eklenmez (eklenirse Faz C'de eklenmiş olmalıydı, geri dön).

---

## Özet (port edilecek + atlanan)

| Kategori | Sayı | Modüller |
|---|---|---|
| Zaten var (görsel port yeter) | 16 | audit-log, categories, content, coupons, customers, admins, finance(KPI), login-attempts, menu, message-log(broadcast subset), orders(N/A), quality-check(N/A), RBAC(N/A), refs(N/A), reviews, settings |
| Yarı var (eksik tarafı tamamla) | 7 | AI assistant, backups, blog CMS, loyalty, FAQ, trust items, toggle API |
| Yeni port edilecek (Faz G-I) | 11 | M1-M11 listesi (AI generic, 404, GSC, KW finder, pillars, quality, DNS, message log, cron hub, loyalty tier, RBAC) |
| Atlanan (marketplace uygun değil) | 15 | bundles, campaigns, city-landings(opsiyonel), EEAT, formula, gallery, orders, price-tool, products, quiz, showcase, sliders, splash, subscriptions × 2, fraud(opsiyonel) |

**Sonuç:** 49 fonksiyonel modülün **11 tanesi yeni port**, 16 zaten var, 7 yarı var (tamamlanacak), 15 atlanıyor. Faz A-F (görsel) sonrası 24-32 saat × 14 commit ek iş.
