# SEO Research — Yapgitsin (Phase 84)

**Hedef:** Türkiye hizmet pazarına yönelik public web SEO altyapısı planı. Airtasker referans, TR rakipler (Armut, Mr Usta, Ustabulurum, BuBiTeklif, Ustamgeliyor) ışığında actionable matris.

---

## Bölüm 1 — Airtasker Analizi

Airtasker'ın halka açık web yapısı SEO odaklı tasarlanmış. Gözlemlenen pattern'ler:

- **URL şeması (kategori + lokasyon kombinasyonu):**
  - `/cleaning-services` (kategori hub)
  - `/cleaning-services/sydney` (kategori + şehir)
  - `/cleaning-services/sydney/eastern-suburbs` (kategori + şehir + ilçe)
  - `/tasks/<slug>-<short-id>` (ilan detayı)
  - `/u/<username>` (usta profili)
- **Meta pattern:** Title `"<Kategori> in <Şehir> | Airtasker"` (~55-60 char). Description "Find trusted <kategori> in <şehir>. Get free quotes from local taskers." (~150 char).
- **Schema.org:** `Service`, `LocalBusiness`, `AggregateRating`, `Review`, `BreadcrumbList`, `FAQPage` (kategori sayfalarında "How much does X cost?" FAQ blokları).
- **Internal linking:** Kategori sayfasında ilgili alt-kategoriler + popüler şehirler chip'leri; ilan sayfasında "Similar tasks nearby". Bu link graph kategori→şehir→ilçe yönünde sıkı.
- **Sitemap:** Çoklu sitemap index — `/sitemap-categories.xml`, `/sitemap-cities.xml`, `/sitemap-tasks.xml`. Yeni ilanlar `<lastmod>` ile günlük yenileniyor.
- **Sosyal kanıt:** Her kategori sayfası AggregateRating + ortalama fiyat aralığı + tamamlanan iş sayısı içeriyor (Trust + uzun içerik için).

---

## Bölüm 2 — Türkiye Rakip Karşılaştırma

| Platform | URL Şeması | Şehir/İlçe Sayfası | Schema | Long-tail Hedefleme | Notlar |
|---|---|---|---|---|---|
| **Armut.com** | `/<kategori>` ve `/<ilçe>-<kategori>` (örn `/sincan-seo-uzmani`) | Var, ilçe bazında binlerce sayfa | LocalBusiness + Review | Çok güçlü ("sincan seo", "çankaya temizlikçi") | TR pazar lideri — en iyi long-tail kapsama |
| **Mr Usta** | `/<kategori>` flat | Sınırlı | Hafif | Zayıf | Kategori derinliği düşük |
| **Ustabulurum** | `/firma/<slug>` + kategori dizini | İlçe bazında değil, il bazında | Yok/zayıf | Orta | Rehber ağırlıklı, transactional zayıf |
| **BuBiTeklif** | `/<kategori>` | Yok | Yok | Düşük | Yeni, SEO ham |
| **Ustamgeliyor** | `/<kategori>/<şehir>` | Var | Hafif | Orta | Armut'a benzer ama daha az içerik |

**Sonuç:** Armut hâkim, ama ilan detay sayfaları (uzun-kuyruk + kullanıcı içeriği) zayıf. Yapgitsin için açık fırsat: **ilçe × kategori × güncel ilan** içerik kombinasyonu.

---

## Bölüm 3 — SEO En İyi Uygulamaları (2026)

**Title:** 50-60 karakter (~580px). 51-55 char title'ların yalnızca %40'ı Google tarafından yeniden yazılıyor, 70+ char'lar nerdeyse %100. Format: `<Hizmet> <Şehir/İlçe> — <Marka>`.

**Meta description:** 140-160 karakter. Direkt ranking faktörü değil ama CTR'a etki ediyor.

**Görseller (2026 stack):** AVIF → WebP → JPEG fallback. AVIF JPEG'den ~%50, WebP'den ~%20-30 küçük. `<picture>` + `srcset` + `sizes`. Hero görselde `fetchpriority="high"`, alt görsellerde `loading="lazy"`. Explicit `width`/`height` (CLS önleme). Alt text ilk 16 kelime ağırlıklı, anlamlı; dekoratif görseller `alt=""`.

**Video:** `VideoObject` schema (thumbnailUrl, uploadDate, duration ISO 8601, contentUrl).

**Core Web Vitals:** LCP < 2.5s, INP < 200ms, CLS < 0.1. Hatalı lazy-loading p75 LCP'yi 2922ms→3546ms çıkarıyor.

**JSON-LD format zorunlu** (microdata/RDFa değil).

---

## Bölüm 4 — Yapgitsin Öneri Matrisi (Top 15)

| # | Öneri | Priority | Effort | Impact |
|---|---|---|---|---|
| 1 | Public web (Next.js SSG/ISR) ayrı route — admin-panel'den ayrıştır | P0 | L | XL |
| 2 | URL şeması: `/<kategori>` + `/<kategori>/<sehir>` + `/<kategori>/<sehir>/<ilce>` | P0 | M | XL |
| 3 | İlan detay public: `/ilan/<slug>-<shortId>` (canonical + noindex iş kapatılınca) | P0 | M | L |
| 4 | Usta profili public: `/usta/<slug>-<shortId>` | P0 | S | L |
| 5 | Schema.org JSON-LD: Service, LocalBusiness, Person, Offer, Review, AggregateRating, BreadcrumbList | P0 | M | L |
| 6 | XML sitemap index (kategori, şehir, ilan, usta — ayrı sitemap'ler, lastmod) | P0 | S | L |
| 7 | Title/desc template engine (her sayfa tipi için) | P0 | S | L |
| 8 | AVIF/WebP `<picture>` + Sharp pipeline genişletme (mevcut 1024px → +srcset) | P1 | M | M |
| 9 | FAQ schema kategori sayfalarında ("İstanbul temizlik fiyatı ne kadar?") | P1 | S | M |
| 10 | Breadcrumb UI + schema | P1 | S | M |
| 11 | İç bağlantı: kategori→ilçe chip'leri + "Yakındaki ilanlar" | P1 | M | L |
| 12 | `hreflang="tr-TR"` + `<html lang="tr">` | P1 | XS | S |
| 13 | robots.txt + meta robots (kapatılan ilanlar `noindex,follow`) | P1 | XS | M |
| 14 | OpenGraph + Twitter Card her sayfa tipinde | P2 | S | M |
| 15 | Google Search Console + Bing Webmaster + IndexNow ping | P2 | S | M |

---

## Bölüm 5 — Public Web URL Şeması Önerisi

```
/                                    Anasayfa
/temizlik                            Kategori hub
/temizlik/istanbul                   Kategori + şehir
/temizlik/istanbul/kadikoy           Kategori + şehir + ilçe
/elektrikci/ankara/cankaya           ...
/ilan/salon-badana-2-oda-ax7k9p      İlan detayı (slug + 6-char shortId)
/usta/ahmet-yilmaz-bx3m2q            Usta profili
/kategoriler                         Tüm kategoriler dizini
/sehirler                            Tüm şehirler dizini
/blog/<slug>                         İçerik pazarlama (uzun-kuyruk)
/sss                                 FAQPage schema
```

**Slug kuralı:** Türkçe karakterler dönüştürülür (`İstanbul`→`istanbul`, `Çilingir`→`cilingir`). Trailing slash yok. Lowercase. Tireli (`-`).

**Canonical:** Filtreli URL'ler (`?budget=...`) canonical olarak temiz URL'i gösterir.

---

## Bölüm 6 — Schema.org JSON-LD Örnekleri

**Service (kategori sayfası):**
```json
{
  "@context":"https://schema.org",
  "@type":"Service",
  "serviceType":"Ev Temizliği",
  "name":"İstanbul Ev Temizliği",
  "areaServed":{"@type":"City","name":"İstanbul"},
  "provider":{"@type":"Organization","name":"Yapgitsin","url":"https://yapgitsin.com"},
  "offers":{"@type":"AggregateOffer","priceCurrency":"TRY","lowPrice":"500","highPrice":"3500"},
  "aggregateRating":{"@type":"AggregateRating","ratingValue":"4.7","reviewCount":"1284"}
}
```

**Person (usta profili):**
```json
{
  "@context":"https://schema.org",
  "@type":"Person",
  "name":"Ahmet Yılmaz",
  "image":"https://yapgitsin.com/uploads/identity/ahmet/kimlik.jpg",
  "jobTitle":"Elektrikçi",
  "address":{"@type":"PostalAddress","addressLocality":"Kadıköy","addressRegion":"İstanbul","addressCountry":"TR"},
  "aggregateRating":{"@type":"AggregateRating","ratingValue":"4.9","reviewCount":"42"}
}
```

**JobPosting (ilan):**
```json
{
  "@context":"https://schema.org",
  "@type":"JobPosting",
  "title":"Salon Badana — 2 oda + salon",
  "description":"...",
  "datePosted":"2026-05-08",
  "validThrough":"2026-06-08",
  "hiringOrganization":{"@type":"Person","name":"Müşteri Adı"},
  "jobLocation":{"@type":"Place","address":{"@type":"PostalAddress","addressLocality":"Beşiktaş","addressRegion":"İstanbul","addressCountry":"TR"}},
  "baseSalary":{"@type":"MonetaryAmount","currency":"TRY","value":{"@type":"QuantitativeValue","minValue":1500,"maxValue":3000,"unitText":"PROJECT"}}
}
```

**Review:**
```json
{
  "@context":"https://schema.org",
  "@type":"Review",
  "itemReviewed":{"@type":"Service","name":"Ev Temizliği"},
  "author":{"@type":"Person","name":"Fatma K."},
  "reviewRating":{"@type":"Rating","ratingValue":"5","bestRating":"5"},
  "reviewBody":"Hızlı ve titizdi."
}
```

**BreadcrumbList** + **FAQPage** kategori sayfalarında zorunlu.

---

## Sources

- [Schema.org Service](https://schema.org/Service)
- [Schema.org LocalBusiness](https://schema.org/LocalBusiness)
- [Google LocalBusiness Structured Data](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- [Schema Markup Guide 2026 — Backlinko](https://backlinko.com/schema-markup-guide)
- [Meta Title Length 2026 — Scalenut](https://www.scalenut.com/blogs/meta-title-length-best-practices-2026)
- [Title/Meta Best Practices 2026 — Straight North](https://www.straightnorth.com/blog/title-tags-and-meta-descriptions-how-to-write-and-optimize-them-in-2026/)
- [Image SEO 2026 — Digital Applied](https://www.digitalapplied.com/blog/image-seo-complete-optimization-guide-2026)
- [WebP/AVIF 2026 — Xictron](https://www.xictron.com/en/blog/image-seo-webp-avif-online-shops-2026/)
- [Lokal SEO Rehberi — Haberler Mersin](http://www.haberlermersin.com/lokal-seo-rehberi-nedir-nasil-yapilir)
- [Armut Sincan SEO Uzmanı (URL örneği)](https://armut.com/sincan-seo-uzmani)
- [Mr Usta](https://mrusta.com.tr/en/)
- [Ustabulurum](https://www.ustabulurum.com/)
- [BuBiTeklif](https://bubiteklif.com/)
- [Ustamgeliyor](https://www.ustamgeliyor.com)
- [E-commerce SEO 2026 — Koanthic](https://koanthic.com/en/e-commerce-seo-2026-complete-optimization-guide/)
