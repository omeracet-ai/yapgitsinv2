# Yol Haritası — Çift Yönlü Marketplace

**Hedef:** Yapgitsin'i tek yönlü (müşteri → usta talep) modelden çift yönlü (hem müşteri talep ilanı + hem usta hizmet ilanı) Airtasker/Bionluk hibrit modeline geçir.

**Durum:** 2026-05-19, HEAD `dfcac96d`, Flutter prod-ready, backend prod (api.yapgitsin.tr).

---

## 1. Domain Modeli & Veri Akışı

### 1.1 Karar: Tek tablo + `kind` ayraç

Mevcut `jobs` tablosuna **`kind: enum('request','offer')`** kolonu ekle.

**Neden tek tablo (yeni `service_listings` yerine):**
- `title/description/category/location/budgetMin/budgetMax/photos/videos` her ikisinde de aynı şekil
- Teklif modeli (`offers` tablosu) tek bir foreign key ile ikisine de bağlanır
- Ortak akışlar (fraud check, geohash, photos upload, search) duplikasyon olmaz
- Migration küçük (1 kolon + 1 index)

### 1.2 Şema Değişiklikleri

```sql
-- nestjs-backend/src/migrations/1747700000000-add-job-kind.ts
ALTER TABLE jobs ADD COLUMN kind TEXT NOT NULL DEFAULT 'request';
CREATE INDEX idx_jobs_kind_status ON jobs(kind, status, createdAt DESC);

-- workerId zaten customerId alanında saklanır (anlam değişir):
--   kind='request' → customerId = müşteri (alıcı)
--   kind='offer'   → customerId = usta (satıcı), aslında posterId
```

**Alternatif:** Daha temiz semantik için `customerId` → `posterId` rename. Migration data preserves. Risk: 27+ endpoint'te query güncellemesi.

→ **Phase 1 kapsamı:** `customerId` kalır, kod katmanında `posterId` getter ekleyerek anlamı netleştir.

### 1.3 Offer/Teklif Yönü Tersine Çalışır

| Job.kind | Offer.userId | Offer anlamı |
|---|---|---|
| `request` (müşteri talep) | Usta id | "Şu fiyata bu işi yaparım" (mevcut) |
| `offer` (usta ilan) | Müşteri id | "Bu hizmeti almak istiyorum, şu tarihte" (yeni) |

`offers` tablosu zaten generic (jobId + userId + amount + message). Sadece UI'da rol etiketi değişir.

### 1.4 Questions/Soru Yönü

`job_questions` tablosu zaten generic. Soru-cevap akışı her iki kind için aynı:
- `request`: müşteri ilanına soru → ustalar sorabilir, müşteri cevap verir
- `offer`: usta ilanına soru → müşteriler sorabilir, usta cevap verir

UI tarafında `kind`'a göre rol etiketi (Soruyu Soran/Cevaplayan) gösterilir.

### 1.5 Veri Akış Diyagramı

```
                  ┌──────────────────────────────┐
                  │   jobs (kind='request')      │
                  │   müşteri → usta bid         │
                  │                              │
   Müşteri ─────► │   /jobs POST (mevcut)        │ ◄──── Usta /offers POST
                  │                              │
                  └──────────────────────────────┘

                  ┌──────────────────────────────┐
                  │   jobs (kind='offer')        │
                  │   usta → müşteri inquiry     │
                  │                              │
   Usta ───────► │   /jobs POST kind=offer      │ ◄──── Müşteri /offers POST
                  │                              │
                  └──────────────────────────────┘

                            ▼
                  ┌──────────────────────────────┐
                  │   /chats (zaten generic)     │
                  │   onaylanan offer → chat     │
                  └──────────────────────────────┘
                            ▼
                  ┌──────────────────────────────┐
                  │   /bookings (zaten generic)  │
                  │   chat → randevu             │
                  └──────────────────────────────┘
```

Mevcut `bookings`, `reviews`, `chats`, `payments` (iyzico), `fraud-detection` modülleri **değişmeden** çalışır.

---

## 2. Backend Mimarisi & Güvenlik

### 2.1 DTO Güncelleme

```typescript
// nestjs-backend/src/modules/jobs/dto/job.dto.ts
export enum JobKind { REQUEST = 'request', OFFER = 'offer' }

export class CreateJobDto {
  // ... mevcut alanlar
  @IsOptional()
  @IsEnum(JobKind)
  kind?: JobKind = JobKind.REQUEST; // default mevcut davranışı korur
}
```

### 2.2 Service Layer

```typescript
// nestjs-backend/src/modules/jobs/jobs.service.ts
async create(dto: CreateJobDto, posterId: string) {
  // Phase X — kind=offer için kullanıcı usta mı kontrol et
  if (dto.kind === JobKind.OFFER) {
    const user = await this.usersRepo.findOne({ where: { id: posterId } });
    if (!user?.workerCategories?.length) {
      throw new BadRequestException(
        'Hizmet ilanı yayınlamak için önce usta profili oluşturun.'
      );
    }
  }
  // ...
}

async findAllPaged(filter: JobsFilter) {
  // kind parametresi filtreye eklenir
  if (filter.kind) qb.andWhere('job.kind = :kind', { kind: filter.kind });
  // ...
}
```

### 2.3 Yeni/Güncellenen Endpoints

| Endpoint | Değişiklik |
|---|---|
| `POST /jobs` | DTO `kind` kabul eder, default `request` |
| `GET /jobs?kind=offer` | Yeni filter — Hizmet İlanları tab kullanır |
| `GET /jobs?kind=request` | Mevcut Fırsatlar tab |
| `GET /jobs/my?kind=offer` | Ustanın kendi hizmet ilanları (Profil sekmesinde "İlanlarım") |
| `POST /jobs/:id/offers` | Çift yönlü teklif (mevcut endpoint, sadece offer.userId rolü değişir) |
| `POST /jobs/:id/questions` | Çift yönlü soru (mevcut) |
| `POST /jobs/:id/boost` | Hizmet ilanlarına da boost (mevcut çalışır) |

### 2.4 Güvenlik Checklist

- [ ] **AuthZ:** `kind=offer` post yetkisi sadece worker profili olan kullanıcılarda (`workerCategories?.length > 0`)
- [ ] **Owner guard:** `update/delete jobs/:id` sahiplik kontrolü zaten `customerId === user.id` ile yapılıyor — kind değişmez şart eklenir (kind immutable after create)
- [ ] **Rate limit:** kind=offer post için throttle (mevcut `@Throttle` decorator'ı genişlet). Spam usta ilanı önlemi.
- [ ] **Fraud check:** mevcut `fraudDetection.analyzeJobListing` her iki kind için çalışır
- [ ] **iyzico boost:** sadece poster boost'layabilir; cross-ownership testi unit test
- [ ] **PII leak:** offer alıcısı `phoneNumber`u, accept edene kadar görmemeli (mevcut chat-only şartı korunur)
- [ ] **Soft delete:** mevcut `deletedAt` çalışır, kind agnostic
- [ ] **DB index:** `(kind, status, createdAt DESC)` performans için
- [ ] **Backwards compat:** mevcut Job.create() kullanıcıları (admin, seed) kind default'u 'request' alır, kırılmaz

### 2.5 Validation Notları

```typescript
// Hizmet ilanlarında budgetMin = ustanın istediği ücret, budgetMax opsiyonel
// Request ilanlarında budgetMin/Max = müşterinin bütçe aralığı
// Schema aynı, UI etiketleri kind'a göre değişir.
```

---

## 3. Flutter Mimarisi

### 3.1 Yeni Provider

```dart
// hizmet_app/lib/features/jobs/presentation/providers/job_provider.dart
final serviceListingsProvider = StateNotifierProvider<JobNotifier, AsyncValue<List<Job>>>((ref) {
  return JobNotifier(ref.watch(jobRepositoryProvider), kind: 'offer');
});
```

`JobNotifier`'a `kind` parametresi ekle → mevcut `jobsProvider` (kind='request' default) bozulmaz.

### 3.2 Model Genişletmesi

```dart
class Job {
  // ... mevcut alanlar
  final String kind; // 'request' veya 'offer'
  
  factory Job.fromMap(Map<String, dynamic> map) {
    return Job(
      // ...
      kind: (map['kind'] as String?) ?? 'request',
    );
  }
}
```

### 3.3 Yeni Akış: "Hizmet İlanı Ver"

Mevcut `PostJobScreen`'i çift kullan:
- Müşteri girişi → "İlan Ver" → kind='request' (mevcut)
- Usta girişi → "Hizmet İlanı Ver" → kind='offer'

```dart
// post_job_screen.dart
class PostJobScreen extends ConsumerStatefulWidget {
  final String kind; // 'request' | 'offer'
  // ...
}
```

UI etiketleri `kind`'a göre değişir:
- Başlık: "İlan Ver" / "Hizmet İlanı Ver"
- Bütçe alanı: "Bütçe Aralığı" / "Hizmet Ücreti"
- CTA: "İlanı Yayınla" / "Hizmetimi Yayınla"

### 3.4 Tab Yeniden Düzenleme

**Mevcut:** `HizmetAlScreen` → [Hizmet İlanları (ProviderList) / Fırsatlar (jobs) / Harita / İşlerim]

**Yeni:**
```
HizmetAlScreen ("Yapgitsin")
├── Hizmet İlanları   → ServiceListingsScreen (jobs kind='offer')
├── Ustalar           → ProviderListScreen (mevcut, rename)
├── Fırsatlar         → JobOpportunitiesBody (jobs kind='request', mevcut)
├── Harita            → MapScreen
└── İşlerim           → MyJobsBody
```

Yeni `ServiceListingsScreen` `JobListScreen` template'inden klonlanır, fakat:
- `jobsProvider` yerine `serviceListingsProvider`
- Kart layout: müşteri perspektifinden (usta avatar + bio + kategori + ücret + "Teklif Ver" CTA)
- Filter: kategori, ücret aralığı, müsaitlik, rating

### 3.5 Detay Ekranı

`JobDetailScreen` `kind`'a göre branş:
- `kind='request'`: mevcut UI (müşteri ilanı, ustalar bid verir)
- `kind='offer'`: yeni UI varyantı:
  - Üstte usta kartı (avatar + rating + verify badge)
  - "Hizmeti Al" CTA (Teklif Gönder bottom sheet açar)
  - Mevcut sorular/yorumlar bölümleri aynı

### 3.6 Profil / İşlerim Sekmesi

`MyJobsBody`'ye 2 sub-tab eklenir:
- "Taleplerim" (kind='request' — müşteri olarak yayınladığım)
- "Hizmetlerim" (kind='offer' — usta olarak yayınladığım, sadece worker profile olanlarda görünür)

### 3.7 Home Tab Güncelleme

Mevcut "Son İlanlar" section'ı zaten `jobsProvider` kullanıyor → `kind='request'` filtresi default. Yeni section eklenebilir:
- "Öne Çıkan Hizmet İlanları" → kind='offer' featured

---

## 4. Tasarım Sistemi — Tek Uyum

### 4.1 Mevcut Tema Token'ları

`AppColors` (Phase 221 dark mode):
- Background: `#0C1117` (siyah)
- Surface: `#161B22`
- Surface Elevated: `#1C2128`
- Border: `#30363D`
- Primary: `#4ADE80` (yeşil)
- TextPrimary: `#FFFFFF`
- TextSecondary: `#9CA3AF`
- TextHint: `#6B7280`

### 4.2 Kabul Edilen Tasarım Pattern'leri (bu session'da netleşen)

| Element | Standart |
|---|---|
| Sayfa arka planı | `AppColors.background` siyah |
| Header (AppBar bölgesi) | Düz `AppColors.background`, gradient yok |
| Kart arka planı | `AppColors.darkSurface` |
| Kart border | `AppColors.darkBorder` |
| Chip active | Beyaz bg + siyah text (light pill) |
| Chip inactive | `AppColors.surfaceElevated` + beyaz text |
| Filter active | `AppColors.primary` (yeşil) + beyaz text |
| Search bar | `AppColors.surfaceElevated` bg, beyaz text, gri hint |
| Section header | Beyaz başlık + yeşil action label |
| Sliver | `pinned: false` — header content ile birlikte kaydırılır |

### 4.3 Audit & Düzeltme Yapılacak Ekranlar

Tüm ekranları bu standartlara hizalamak için audit:

- [ ] `PostJobScreen` — light theme component kaldı mı?
- [ ] `JobDetailScreen` — beyaz bg blok'ları siyaha
- [ ] `ProviderProfileScreen` — kart border + bio bölümü
- [ ] `MyJobsScreen` — sub-tab indicator + empty state
- [ ] `NotificationScreen` — notification card bg
- [ ] `ProfileScreen` — settings row + section divider
- [ ] `MapScreen` — search + filter overlay
- [ ] `BookingCreateScreen` — calendar widget tema
- [ ] `OffersScreen` — offer card + status badge
- [ ] `EditProfileScreen` — form alanları + dropdown
- [ ] `LoginScreen` / `RegisterScreen` — input field bg
- [ ] `OnboardingScreen` — slide bg + indicator dots

### 4.4 Reusable Component Library

```dart
// hizmet_app/lib/core/widgets/themed/
//   themed_chip.dart         — _chip pattern (active/inactive)
//   themed_card.dart         — surface + border + radius standart
//   themed_search_bar.dart   — search bar template
//   themed_section.dart      — SectionHeader + content padding
//   themed_filter_button.dart — filter pill + badge
```

Mevcut bir-defa kullanılan widget'lar (CategoryCard, SectionHeader) bu library'ye taşınır. Yeni ekranlar bunları kullanır → tutarlılık.

### 4.5 Tema Doğrulama Test'i

```dart
// hizmet_app/test/theme_consistency_test.dart
// Tüm ekran build()'lerini render et, AppColors.background dışı root
// background varsa fail. Statik analiz / golden test.
```

---

## 5. Faz Planı & Sıra

### Phase A — Schema + Backend (Yarım gün)
1. Migration: `jobs.kind` ekle + index
2. Job entity güncelle
3. CreateJobDto + JobKind enum
4. Service: validation (kind=offer için worker check)
5. Controller: `kind` query param desteği
6. Unit testler (kind validation, offer/request ayrımı)
7. Deploy + smoke

### Phase B — Flutter Core (Yarım gün)
1. Job model `kind` alanı
2. `serviceListingsProvider` ekle
3. JobRepository kind parametresi
4. PostJobScreen kind-aware (request/offer)
5. Routing: `/hizmet-ilani-ver` route

### Phase C — Yeni Tab UI (1 gün)
1. `ServiceListingsScreen` (Hizmet İlanları tab)
2. JobDetailScreen kind branching
3. HizmetAlScreen tab sırası güncelle
4. Card layout (usta perspektifli)
5. Empty/loading/error states

### Phase D — Profil + İşlerim (Yarım gün)
1. MyJobsBody sub-tab (Taleplerim/Hizmetlerim)
2. Profile sekmesinde "Hizmetlerim" girişi (sadece worker)
3. Edit/delete kind-aware

### Phase E — Tasarım Audit (Yarım gün)
1. Section 4.3 listesindeki 12 ekranı tara
2. Hardcoded beyaz/açık tema değerleri AppColors token'larına
3. Themed component library ilk versiyon

### Phase F — Güvenlik & Test (Yarım gün)
1. Section 2.4 checklist
2. AuthZ unit test (offer = worker only)
3. Rate limit smoke
4. E2E: müşteri offer → usta accept → chat → booking → review (her iki kind)

### Phase G — Seed & Doğrulama (2 saat)
1. Seeder güncelle: 5-10 örnek hizmet ilanı (kind=offer) ekle
2. Demo Usta hesabı kind=offer test ilanı oluştur
3. Prod smoke

**Toplam tahmin: 3-4 gün net iş**

---

## 6. Riskler & Azaltma

| Risk | Etki | Azaltma |
|---|---|---|
| Migration prod'da timeout | Backend down | Off-peak deploy + `IF NOT EXISTS` defensive SQL |
| Mevcut Job.create() kullanıcıları kind beklemiyor | API kırılır | DTO default='request', backwards compat |
| Worker profile yokken kind=offer post | Confused UX | Frontend gate + backend 400 BadRequest |
| Hizmet İlanları tab'ı eski semantiği özleyenler için confuse | UX | "Ustalar" tab korunur, rename değil yan tab |
| Offer/Question rol etiketleri karışır | UX bug | UI test + manual QA matris |
| Boost double-charge (her iki kind için iyzico) | Para kaybı | Mevcut idempotency key korunur, kind agnostic |
| iOS App Store iki yönlü marketplace policy | Yayın blok | Apple App Store guideline 4.5 review öncesi kontrol |

---

## 7. Memory'e Saklanacaklar (Phase A tamamlanınca)

- [ ] `project_two_sided_marketplace.md` — domain model + kind enum kuralı
- [ ] `reference_job_kind_default.md` — DTO default='request' (backwards compat)
- [ ] `feedback_design_system_v2.md` — section 4.2 standartları
- [ ] `feedback_themed_component_library.md` — section 4.4 yeni widget pattern

---

## 8. Out of Scope (Phase 2'ye Ertelenen)

- Hizmet ilanlarına paket/varyant (basic/premium tiers)
- Subscription model (aylık abonelik ile sınırsız ilan)
- Multi-image gallery for service listings (mevcut photos array yeterli)
- AI-powered category suggestion for service listings
- Featured slot bidding/auction
- Cross-tenant marketplace (multi-tenant kapalı şu an)

---

**Karar bekleyen:** Bu plan onaylanırsa Phase A'dan başla. Onay ver → migration + DTO + service değişiklikleri otonom giderim.
