# /httpdocs — Olması Gereken Yapı & Deploy Eşlemesi

Plesk File Manager / FTP kullanan biri için referans. Kaynak: `scripts/deploy-to-d.sh` + `scripts/ftp-upload.ps1` (Phase 162–182).

> **TL;DR:** Canlı web sitesi `/httpdocs` **kökünde** durur (Next.js static export). `admin/`, `app/`, `backend/` alt klasörlerdir. Kaynak ağaçları (`nestjs-backend/`, `web/`, `admin-panel/`, `hizmet_app/`) **asla** sunucuda olmamalı — `.env*`, `node_modules`, `hizmet_db.sqlite`, log içerirler.

---

## 1. Deploy Eşlemesi (yerel → sunucu)

| Yerel klasör | Sunucu yolu | İçerik | Build komutu |
|---|---|---|---|
| `D:\web\*` | `/httpdocs/` (kök) | Next.js static export — `index.html`, `_next/`, kategori sayfaları (`temizlik/istanbul/` …), `sitemap.xml`, `robots.txt`, `web.config` | `cd web && npm run build` (deploy-to-d.sh: `NEXT_PUBLIC_SITE_URL=https://yapgitsin.tr`, `.env.local` build sırasında gizlenir) |
| `D:\admin\*` | `/httpdocs/admin/` | Next.js standalone — `server.js`, `.next/static/`, `public/`, `web.config`, placeholder `index.html` | `cd admin-panel && npm run build` (`.next/standalone` çıktısı) |
| `D:\app\*` | `/httpdocs/app/` | Flutter web — `main.dart.js`, `assets/`, `canvaskit/`, `index.html` (`<base href="/app/">`) | `cd hizmet_app && flutter build web --release` |
| `D:\backend\*` | `/httpdocs/backend/` | NestJS derlenmiş — `src/main.js` (dist içeriği), `package.json`, `package-lock.json`, `web.config`, `boot-check.js`, `.env.production`, `_test/`, placeholder `index.html` | `cd nestjs-backend && npm run build`; **sunucuda** `npm install --omit=dev` gerekir |

> ⚠️ `ftp-upload.ps1` mapping: `D:\web → $FTP_REMOTE_DIR` (yani `/httpdocs` köküne, klasör olarak değil **içeriği**); diğer üçü `$FTP_REMOTE_DIR/{admin,app,backend}`.

---

## 2. `/httpdocs` İçinde OLMASI GEREKEN (KEEP)

**Kök seviyesi (D:\web çıktısı):**
- `index.html`, `404.html`, `404/`
- `_next/` (+ `__next.*` yardımcı dosyalar)
- Kategori klasörleri: `temizlik/`, `tesisat/`, `elektrikci/`, `tadilat/`, `boya/`, `nakliyat/`, … (~40 kategori × şehir alt klasörleri: `temizlik/istanbul/`, `temizlik/ankara/` …)
- `az/`, `en/` (dil sürümleri), `blog/`, `ara/`, `usta/`, `ilan/`, `musteri/`, `kategoriler/`
- `cerez-politikasi/`, `gizlilik-politikasi/`, `kullanim-kosullari/`, `kvkk/`
- `sitemap.xml`, `robots.txt`
- `og-image.png`, `manifest.webmanifest`, `favicon.ico`, `favicon.svg`
- `web.config`, `.htaccess`, `.user.ini`

**Alt klasörler:**
- `admin/` — Next.js standalone (canlı admin panel)
- `app/` — Flutter web (canlı mobil/web app)
- `backend/` — NestJS API (canlı, Node)

**Plesk default'ları (dokunma):**
- `error_docs/`, `cgi-bin/`, `.well-known/` (Let's Encrypt ACME challenge)

---

## 3. `/httpdocs` İçinde OLMAMASI GEREKEN (SİL)

**Kaynak ağaçları — GÜVENLİK RİSKİ (`.env*` + `node_modules` + `hizmet_db.sqlite` + log):**
- `nestjs-backend/`
- `web/`
- `admin-panel/`
- `hizmet_app/`
- `agents/`

**RCE riski — kökteki tüm PHP:**
- `patlat.php`, `hunter.php`, `dir.php`, `setup.php`, `*.php` (hepsi)

**Arşiv / dump / debug çıktıları:**
- `*.rar`, `*.zip` (örn `web_final_tr.zip`)
- `*.log`
- `filezilla-yapgitsin.xml`
- `sync-test.txt`, `index.txt`, `__next._full.txt`, `.last_build_id`
- Kökte başıboş Flutter dosyaları: `main.dart.js`, `flutter.js`, `canvaskit/` — **eğer kökteyseler** (canlı Flutter `app/` altında olmalı, kökte değil)

---

## 4. KRİTİK Uyarılar

1. `admin/` ≠ `admin-panel/` — ilki canlı build (**KALIR**), ikincisi kaynak (**SİLİNİR**).
2. `backend/` ≠ `nestjs-backend/` — ilki canlı (`src/main.js`), ikincisi kaynak.
3. `app/` ≠ `hizmet_app/` — ilki Flutter web build, ikincisi Flutter kaynak.
4. Canlı web sitesi **`/httpdocs/web/` klasörünün İÇİNDE DEĞİL** — kök dizindeki dosyalardır. `D:\web` deploy edilirken **içeriği** (`D:\web\*`) köke gider, `D:\web` klasörü olarak DEĞİL.
5. `web.config` Plesk standalone uygulamalarında iisnode köprüsü için kritik — `deploy-to-d.sh` standalone-bundled olanı üzerine yazar; sil/değiştir-me.
6. **localhost:3000 sızıntısı**: `web` build'i `.env.local`'ı kapmamalı (Next.js'de `.env.production`'ı override eder → `sitemap.xml`/`robots.txt`/`canonical`'a `http://localhost:3000` gömülür). `deploy-to-d.sh` (Phase 182) build sırasında `.env.local`'ı `.env.local.deploybak` olarak gizler. **Eğer canlıda hâlâ `localhost:3000` görünüyorsa: eski (Phase 182 öncesi) deploy yüklenmiş — `D:\web`'i yeniden build edip yükle.**

---

## 5. Deploy Adımları (özet)

1. **Lokal build:** `bash scripts/deploy-to-d.sh` → `D:\web`, `D:\admin`, `D:\app`, `D:\backend` taze çıktıyla dolar (eski `.bak.*` otomatik temizlenir).
2. **Yükleme (Plesk File Manager):** her klasörü zip'le, `/httpdocs/...`'a yükle, extract et:
   - `D:\web\*` → `/httpdocs/` (kök — içeriği)
   - `D:\admin\*` → `/httpdocs/admin/`
   - `D:\app\*` → `/httpdocs/app/`
   - `D:\backend\*` → `/httpdocs/backend/`
   (alternatif: `pwsh scripts/ftp-upload.ps1` — `.env.deploy` gerektirir)
3. **Temizlik:** Bölüm 3'teki SİL listesindeki her şeyi `/httpdocs`'tan kaldır (kaynak dizinleri, `*.php`, arşivler, loglar).
4. **Plesk → Node.js:** iki uygulama tanımla:
   - `/httpdocs/backend` — startup file `src/main.js`, sonra **NPM Install** (`--omit=dev`), **Enable**, `NODE_ENV=production`
   - `/httpdocs/admin` — startup file `server.js`, **Enable**, `NODE_ENV=production`
5. **Doğrulama:**
   - `https://yapgitsin.tr/` → 200, HTML'de `localhost` **olmamalı**
   - `https://yapgitsin.tr/backend/_test/` → 200 JSON
   - `https://yapgitsin.tr/admin/` → 200 (login sayfası)
   - `https://yapgitsin.tr/app/` → 200 (Flutter splash)
   - `https://yapgitsin.tr/sitemap.xml` → `<loc>` değerleri `https://yapgitsin.tr/...` olmalı
