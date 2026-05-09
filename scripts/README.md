# scripts/

## Phase 166 — IIS + iisnode bootstrap (yapgitsin.tr production)

Plesk Windows + IIS sunucusunda Node.js uygulamalarını (NestJS backend, Next.js admin) IIS pipeline'ından `iisnode` modülü üzerinden çalıştırma.

**Üretilen dosyalar:**
- `nestjs-backend/web.config` — handler `path="dist/main.js"`, URL Rewrite tüm istekleri Node entry'ye yönlendiriyor; `/uploads/*` IIS direct.
- `admin-panel/web.config` — handler `path="server.js"` (Next.js standalone); `_next/static/*` ve public asset'ler IIS direct, kalanı server.js'e rewrite.
- `scripts/deploy-to-d.sh` — build sonrası web.config dosyalarını sırasıyla `D:\backend\web.config` ve `D:\admin\web.config` konumlarına kopyalar (Phase 166 satırları).

**Sunucu ön kontrol (RDP / Plesk SSH):**

```powershell
# 1. iisnode kurulu mu?
Test-Path "$env:ProgramFiles\iisnode\iisnode.dll"
# False dönerse: https://github.com/Azure/iisnode/releases  -> iisnode-full-v0.2.x-x64.msi

# 2. Node.js (varsayilan PATH'te node.exe) -- Plesk panel > Tools & Settings > Node.js
node --version
where.exe node
```

**Plesk panel adımları (her domain/subdomain için):**

1. Domain > **Node.js** sekmesi.
2. Document root: `httpdocs` (yapgitsin.tr) — backend için subdomain önerisi: `api.yapgitsin.tr` -> `httpdocs/backend`.
3. **Application Mode**: `production`.
4. **Application Root**: backend için `httpdocs/backend`, admin için `httpdocs/admin`.
5. **Application Startup File**:
   - Backend: `dist/main.js`
   - Admin: `server.js`
6. **Node.js version**: en az `20.x` (NestJS 10 + Next.js 16 gerekliliği).
7. NPM Install butonu **çalıştırılmaz** — `D:\backend`'de manuel `npm install --omit=dev` yapıldı.
8. Environment Variables (backend için Plesk'ten ekle):
   - `NODE_ENV=production`, `JWT_SECRET`, `DB_TYPE=mysql` veya `postgres`, DB host/user/pass, `ANTHROPIC_API_KEY`, `IYZIPAY_*`, `ALLOWED_ORIGINS=https://yapgitsin.tr,https://admin.yapgitsin.tr`. (`PORT` boş bırakılır — iisnode named pipe ile bağlar.)

**Doğrulama:**

```bash
curl -I https://yapgitsin.tr/backend/health        # 200 + JSON {status,db,uptime,version}
curl -I https://yapgitsin.tr/admin/                # 200 (Next.js login sayfasi)
```

**Troubleshooting:**

| Belirti | Sebep | Çözüm |
|---------|-------|-------|
| 500.19 web.config error | iisnode modülü yüklü değil | iisnode MSI kur, `iisreset` |
| 500.21 handler not registered | iisnode kurulu ama IIS handler listesinde yok | `%windir%\system32\inetsrv\appcmd.exe install module /name:iisnode /image:"%programfiles%\iisnode\iisnode.dll"` |
| 502.5 Process Failure | dist/main.js patladı | `D:\backend\iisnode\*.txt` log'una bak; eksik env veya `node_modules` |
| 404 her route | URL Rewrite modülü yok | IIS URL Rewrite 2.1 kur (`https://www.iis.net/downloads/microsoft/url-rewrite`) |
| 403 admin/ | iisnode handler hiç çalışmadı | `web.config` D:\admin'de var mı, application root admin'i gösteriyor mu |
| Node sürekli restart | `watchedFiles` çok geniş | sadece `dist\**\*.js` ve `web.config` izlenir |

**Log dizinleri:** `D:\backend\iisnode\` ve `D:\admin\iisnode\` — her process per-stdout/stderr ayrı dosya. Maks 20 dosya x 1MB rotate (web.config'de tanımlı).

---

## live-deploy.sh (Phase 163)

FTP push from local `D:\` mirror to live host (`yapgitsin.tr` -> Plesk Windows + IIS).

```bash
# 1. Build + stage to D:\
bash scripts/deploy-to-d.sh

# 2. One-time: copy template + fill credentials
cp .env.deploy.example .env.deploy
# edit .env.deploy with FTP_HOST / FTP_USER / FTP_PASS

# 3. Deploy
source .env.deploy && bash scripts/live-deploy.sh

# Or inline:
FTP_HOST=ftp.yapgitsin.tr FTP_USER=xxx FTP_PASS=yyy bash scripts/live-deploy.sh
```

**ENV vars:** `FTP_HOST`, `FTP_USER`, `FTP_PASS`, `FTP_PORT` (21), `FTP_REMOTE_DIR` (`/httpdocs`), `FTP_USE_TLS` (`1` = FTPS).

**Mirror layout (remote):** `/httpdocs` (web root) + `/httpdocs/{backend,admin,app}`.

**Optimizations:** lftp `mirror -R --delete --parallel=4`, retry x3, passive mode. `.env.deploy` gitignored.

**CI alternative:** `.github/workflows/live-deploy.yml` (manual `workflow_dispatch`, secrets `FTP_HOST/USER/PASS/DIR`).

**Requires:** `lftp` (`pacman -S lftp` / `apt install lftp` / `brew install lftp`) — yoksa Phase 164 PowerShell fallback.

## ftp-upload.ps1 (Phase 164)

Windows native PowerShell FTP deploy. lftp/MSYS2 yoksa otomatik fallback (live-deploy.sh icinden veya direkt cagri).

```powershell
# Direkt PowerShell:
powershell.exe -ExecutionPolicy Bypass -File scripts/ftp-upload.ps1

# pwsh varsa:
pwsh scripts/ftp-upload.ps1

# Bash icinden (live-deploy.sh otomatik fallback yapar):
bash scripts/live-deploy.sh
```

**Ozellikler:** `.env.deploy` parse, `System.Net.FtpWebRequest` (passive mode + binary), TLS destek (`FTP_USE_TLS=1`), 3x retry exponential backoff, klasor recursive auto-create, 4 mapping (D:\admin -> /admin, D:\app -> /app, D:\backend -> /backend, D:\web -> root). Sifir external dependency.

## deploy-to-d.sh (Phase 162)

Build all four targets and deploy to local `D:\` staging tree for FTP upload.

```bash
bash scripts/deploy-to-d.sh
```

**Outputs:** `D:\backend` (NestJS dist + package.json), `D:\admin` (Next.js standalone + .next/static + public), `D:\web` (Next.js static export), `D:\app` (Flutter web build).

**Phase 166 — Flutter web subpath:** Flutter web `https://yapgitsin.tr/app/` altinda host edilir. Build flag zorunlu: `flutter build web --release --base-href /app/`. `web/index.html` icinde `<base href="/app/">` ayarli; `setUrlStrategy(PathUrlStrategy())` `main.dart` icinde aktif. GoRouter base href'i otomatik picks up — ek konfig gerekmez. Mobile build (APK/IPA) bu flag'den etkilenmez.

**Optimization:** Admin uses `output: 'standalone'` in `next.config.ts` — drops ~260M of `.next/cache` and unused chunks (414M -> ~150M).

**Server step:** After FTP, run `npm install --omit=dev` in `D:\backend` on the host.

**Safety:** Old folders renamed to `*.bak.<timestamp>` then deleted only after successful copy.

## migrate-prod.js (Phase 165)

Production MariaDB schema migration runner. Idempotent, tracks applied files in
`_migrations` table.

```bash
# Apply all pending migrations
node scripts/migrate-prod.js

# Apply a specific file
node scripts/migrate-prod.js 001_blog_posts.sql
```

**Reads:** `nestjs-backend/.env.production` (+ optional `.env.production.local`
override for `DB_HOST`).

**Migrations:** `scripts/migrations/*.sql` — must use idempotent DDL
(`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, etc.).
Filenames sort alphanumerically; convention `NNN_description.sql`.

**Why this exists:** `DB_SYNCHRONIZE=false` in production (TypeORM auto-schema
disabled). New entities or column changes need an explicit migration.

**Resolves `mysql2`** from `nestjs-backend/node_modules` so no extra install
needed at repo root.

## smoke-test.sh

Production E2E smoke test. Verifies critical backend + web endpoints after deploy.

```bash
# Local
./scripts/smoke-test.sh

# Production
API_URL=https://api.yapgitsin.tr WEB_URL=https://yapgitsin.tr ./scripts/smoke-test.sh
```

**Requires:** `bash`, `curl`, `jq`.

**Exit codes:** `0` = all pass, `1` = any fail.

**CI:** Runs every 6h via `.github/workflows/smoke.yml` (also `workflow_dispatch`).

Covers 17 endpoints: 6 backend (health, categories, workers, jobs, swagger), 9 web (home, category, category-city, sitemap, robots, manifest, og-image, favicon, kvkk), 2 locales (en, az).

## lighthouse-audit.sh

Lighthouse multi-page performance audit. Generates JSON + HTML reports for 10 key pages.

```bash
# Local
WEB_URL=http://localhost:3002 bash scripts/lighthouse-audit.sh

# Production
WEB_URL=https://yapgitsin.tr bash scripts/lighthouse-audit.sh

# Print score summary table
node scripts/lighthouse-summary.mjs
```

**Pages audited:** `/`, `/temizlik`, `/temizlik/istanbul`, `/usta/test-id`, `/ilan/test-id`, `/ara`, `/kvkk`, `/en`, `/az`, `/sitemap.xml`.

**Score thresholds:** Performance 80+ | Accessibility 90+ | SEO 95+ | Best Practices 90+.

**Reports:** `reports/lighthouse/<timestamp>_<page>.{json,html}` (gitignored).

**CI:** `.github/workflows/lighthouse.yml` — `workflow_dispatch` only; uploads artifacts (30d retention).
