# scripts/

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
