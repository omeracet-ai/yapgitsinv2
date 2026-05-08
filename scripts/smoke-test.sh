#!/bin/bash
# Yapgitsin E2E Smoke Test
# Usage: API_URL=https://api.yapgitsin.tr WEB_URL=https://yapgitsin.tr ./scripts/smoke-test.sh

set -uo pipefail
API_URL="${API_URL:-http://localhost:3001}"
WEB_URL="${WEB_URL:-http://localhost:3002}"
PASS=0
FAIL=0

GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
ok() { echo -e "${GREEN}✓${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}✗${NC} $1"; FAIL=$((FAIL+1)); }

check_status() {
  local url="$1" expected="$2" name="$3"
  local actual=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$actual" = "$expected" ]; then ok "$name [$actual]"; else fail "$name (expected $expected, got $actual)"; fi
}

check_json() {
  local url="$1" jq_path="$2" name="$3"
  local val=$(curl -s "$url" | jq -r "$jq_path" 2>/dev/null || echo "")
  if [ -n "$val" ] && [ "$val" != "null" ]; then ok "$name: $val"; else fail "$name (empty or null)"; fi
}

echo "=== Backend ==="
check_status "$API_URL/health" "200" "Health endpoint"
check_json "$API_URL/health" ".status" "Health status field"
check_status "$API_URL/categories" "200" "Categories list"
check_status "$API_URL/users/workers" "200" "Workers list"
check_status "$API_URL/jobs" "200" "Jobs list"
check_status "$API_URL/api/docs" "200" "Swagger docs"

echo ""
echo "=== Web ==="
check_status "$WEB_URL/" "200" "Home"
check_status "$WEB_URL/temizlik" "200" "Category page"
check_status "$WEB_URL/temizlik/istanbul" "200" "Category-city page"
check_status "$WEB_URL/sitemap.xml" "200" "Sitemap"
check_status "$WEB_URL/robots.txt" "200" "Robots"
check_status "$WEB_URL/manifest.webmanifest" "200" "PWA Manifest"
check_status "$WEB_URL/og-image.png" "200" "OG image"
check_status "$WEB_URL/favicon.svg" "200" "Favicon"
check_status "$WEB_URL/kvkk" "200" "KVKK page"

echo ""
echo "=== Locale routing ==="
check_status "$WEB_URL/en" "200" "English home"
check_status "$WEB_URL/az" "200" "Azerbaijani home"

echo ""
echo "=== Summary ==="
echo "PASS: $PASS"
echo "FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
