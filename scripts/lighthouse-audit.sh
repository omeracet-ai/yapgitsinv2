#!/bin/bash
# Lighthouse multi-page audit
# Usage: WEB_URL=https://yapgitsin.tr ./scripts/lighthouse-audit.sh

set -uo pipefail
WEB_URL="${WEB_URL:-http://localhost:3002}"
mkdir -p reports/lighthouse
TS=$(date +%Y%m%d_%H%M%S)

PAGES=(
  "/"
  "/temizlik"
  "/temizlik/istanbul"
  "/usta/test-id"
  "/ilan/test-id"
  "/ara"
  "/kvkk"
  "/en"
  "/az"
  "/sitemap.xml"
)

for page in "${PAGES[@]}"; do
  safe=$(echo "$page" | sed 's|/|_|g; s|^_||')
  [ -z "$safe" ] && safe="root"
  echo "Auditing $page..."
  npx lighthouse "$WEB_URL$page" \
    --output=json --output=html \
    --output-path="reports/lighthouse/${TS}_${safe}" \
    --chrome-flags="--headless --no-sandbox" \
    --quiet --no-enable-error-reporting || echo "FAIL: $page"
done

echo ""
echo "=== Score Thresholds ==="
echo "Performance: 80+ | Accessibility: 90+ | SEO: 95+ | Best Practices: 90+"
echo "Reports: reports/lighthouse/${TS}_*.{json,html}"
