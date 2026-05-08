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
