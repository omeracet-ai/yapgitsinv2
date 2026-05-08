# Yapgitsin Web — FTP / Shared Hosting Deploy

The `web/` Next.js project is configured for **static export** (`output: 'export'`).
`next build` writes a fully self-contained site to `web/out/` — plain HTML/CSS/JS,
no Node runtime required. Upload that folder to any shared host (cPanel, Plesk,
Hostinger, Natro, Turhost, etc.) over FTP.

---

## 1. Build

```bash
cd web
cp .env.production.example .env.production   # edit URLs
npm install
# (opsiyonel) AI ile kategori SEO içeriklerini güncelle — Phase 89
# Backend ayakta + ANTHROPIC_API_KEY tanımlı olmalı:
#   npm run generate-content
# Bu komut src/data/category-content.json'ı yeniler. Build sırasında
# çağrılmaz; manuel tetiklenir. JSON yoksa fallback intro kullanılır.
npm run build
```

What this produces:

- `web/out/index.html` — anasayfa
- `web/out/{kategori-slug}/index.html` — 8 ana kategori
- `web/out/{kategori-slug}/{sehir-slug}/index.html` — kategori × 14 şehir
- `web/out/usta/{name-id}/index.html` — top 100 worker
- `web/out/ilan/{title-id}/index.html` — top 100 open job
- `web/out/sitemap.xml`, `web/out/robots.txt`
- `web/out/_next/...` — hashed JS/CSS chunks
- `web/out/.htaccess` — Apache rewrite rules (kopyalanır)

**Backend (`NEXT_PUBLIC_API_URL`) build sırasında ulaşılabilir olmalıdır.**
API offline ise dynamic page'ler boş listeyle build edilir (graceful fallback)
ve sitemap'te yer almaz — build çökmez.

---

## 2. FTP Upload

```
web/out/  →  /home/<kullanici>/public_html/   (cPanel default)
```

FileZilla / WinSCP:

1. `out/` içeriğinin **tamamını** seç (içindekileri, klasörü değil).
2. Hosting'in `public_html` (veya `htdocs` / `www`) klasörüne sürükle.
3. `.htaccess` dahil **gizli dosyaların** transferini etkinleştir (FileZilla:
   Server → Force showing hidden files).

---

## 3. Apache `.htaccess` (otomatik)

`web/public/.htaccess` build sırasında `out/.htaccess` olarak kopyalanır ve
şunları yapar:

- Pretty URL → `/foo/` adresini `/foo/index.html` dosyasına yönlendirir.
- 404'leri `/404.html` Next.js error sayfasına bağlar.
- Statik asset'lere 1 yıllık cache header ekler (hash'li `_next/`).
- HTML/XML/TXT kısa cache (5 dk) — sitemap güncel kalır.
- Gzip sıkıştırma açar.

Nginx kullanıyorsanız muadil location bloku gerekir (`try_files $uri
$uri/index.html =404;`).

---

## 4. Limitations (static export)

| Konu | Etki |
|------|------|
| ISR (Incremental Static Regeneration) | **Yok.** Veri değişince yeniden build + upload. |
| Dynamic API routes | **Yok.** `next/route` handler'lar kullanılamaz. |
| `next/image` optimization | Devre dışı (`unoptimized: true`). Görseller orjinal boyut. |
| Worker / Job sayısı | Build-time'da fix (top 100). 101. ilan görünmez. |
| Authenticated views | İstemci taraflı `useEffect` + `localStorage` üzerinden ek edilir. |
| Server Actions, middleware | **Çalışmaz.** Mobil/admin tarafında zaten yok. |

**Veri tazeliği:** Public SEO sayfaları için günde 1 kez (cron) build + FTP
push tipik. Gerçek zamanlı ihtiyaç varsa Bölüm 5'teki alternatiflere geçin.

---

## 5. Alternatives (önerilen)

| Platform | Avantaj | Yapılacak |
|----------|---------|-----------|
| **Vercel** | ISR, otomatik rebuild, edge cache | `next.config.ts`'den `output: 'export'`'u kaldır, `vercel deploy`. |
| **Netlify** | ISR (Next runtime v5), form, redirect | `output: 'export'`'u kaldır, `netlify init`. |
| **Cloudflare Pages** | Bedava CDN, edge fonksiyonları | `output: 'export'` ile statik build da olur, dynamic için `@cloudflare/next-on-pages`. |
| **GitHub Actions + FTP** | Otomatik nightly rebuild + upload | `actions/checkout@v4` + `npm run build` + `SamKirkland/FTP-Deploy-Action`. |

---

## 6. Troubleshooting

- **"404 on every page"** — `.htaccess` upload edilmemiş; `mod_rewrite` kapalı
  olabilir, hosting paneli üzerinden aç.
- **"Worker / Job sayfaları boş"** — Build sırasında backend kapalıydı. API'yi
  açıp tekrar `npm run build`.
- **CSS/JS 404** — `_next/` klasörü tam yüklenmemiş. FTP transferini doğrula.
- **`next build` "Failed to fetch"** — `NEXT_PUBLIC_API_URL` doğru mu, CORS
  build host'unu kabul ediyor mu kontrol et.

## Phase 122 — Google Jobs (JobPosting Indexing API)

İlan sayfaları (`/ilan/[idSlug]`) `JobPosting` schema.org markup içerir.
Google Jobs rich result için sitemap yeterli **değildir**. Manual submit:

1. Search Console → Indexing API erişimi açın
2. Service account JWT ile `POST https://indexing.googleapis.com/v3/urlNotifications:publish`
   body: `{ "url": "https://yapgitsin.tr/ilan/<slug>", "type": "URL_UPDATED" }`
3. İlan kapanınca `URL_DELETED` gönder
