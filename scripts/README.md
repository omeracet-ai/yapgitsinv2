# scripts/

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

**Optimization:** Admin uses `output: 'standalone'` in `next.config.ts` — drops ~260M of `.next/cache` and unused chunks (414M -> ~150M).

**Server step:** After FTP, run `npm install --omit=dev` in `D:\backend` on the host.

**Safety:** Old folders renamed to `*.bak.<timestamp>` then deleted only after successful copy.

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
