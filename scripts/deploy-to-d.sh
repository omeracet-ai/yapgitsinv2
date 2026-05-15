#!/bin/bash
# Yapgitsin Build + Deploy to D:\ (Phase 162)
# Optimizes admin from 414M -> ~150M via Next.js standalone output
set -euo pipefail

BACKUP_TS=$(date +%Y%m%d_%H%M%S)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "Build + Deploy to D:\ (backup: $BACKUP_TS)"
echo "Root: $ROOT"

# Backend (NestJS)
echo "-> Backend build"
cd "$ROOT/nestjs-backend"
npm run build > /dev/null
mv /d/backend "/d/backend.bak.$BACKUP_TS" 2>/dev/null || true
mkdir -p /d/backend
cp -r dist/* /d/backend/
cp package.json package-lock.json /d/backend/
# Phase 166: IIS + iisnode bridge
[ -f web.config ] && cp web.config /d/backend/web.config
# Static placeholder (iisnode yokken /backend/ -> 200)
[ -f index.html ] && cp index.html /d/backend/index.html
# Phase 168: production env (DB creds, JWT secret) for runtime
[ -f .env.production ] && cp .env.production /d/backend/.env.production
# Also as .env: NestJS reads .env even when NODE_ENV is unset on the host,
# so this overrides any stale mysql .env with the correct sqlite config.
[ -f .env.production ] && cp .env.production /d/backend/.env
# Phase 178: iisnode boot-check wrapper + minimal sanity test endpoint
[ -f boot-check.js ] && cp boot-check.js /d/backend/boot-check.js
[ -f IISNODE_DEBUG.md ] && cp IISNODE_DEBUG.md /d/backend/IISNODE_DEBUG.md
# _test/ stays under D:\backend (not in repo); recreate if missing
if [ ! -d /d/backend/_test ]; then
  mkdir -p /d/backend/_test
fi

# Admin (Next.js standalone)
# next.config.ts has `distDir: "dist"` (FTP dot-dir workaround); build output is
# dist/standalone/ (not .next/standalone/). scripts/postbuild-iis.js already
# copies static + public + writes web.config + patches server.js inside
# dist/standalone/, so we just mirror that tree to /d/admin.
echo "-> Admin build (standalone)"
cd "$ROOT/admin-panel"
NEXT_PUBLIC_API_URL=https://api.yapgitsin.tr npm run build > /dev/null
mv /d/admin "/d/admin.bak.$BACKUP_TS" 2>/dev/null || true
mkdir -p /d/admin
if [ -d "dist/standalone" ]; then
  cp -r dist/standalone/. /d/admin/
elif [ -d ".next/standalone" ]; then
  # Legacy fallback (pre-Phase 182 distDir change)
  cp -r .next/standalone/. /d/admin/
  mkdir -p /d/admin/.next
  cp -r .next/static /d/admin/.next/
  [ -d public ] && cp -r public /d/admin/ || true
else
  echo "ERROR: neither dist/standalone nor .next/standalone exists — admin build failed"
  exit 1
fi
# Phase 166: IIS + iisnode bridge (overwrite any standalone-bundled web.config)
[ -f web.config ] && cp web.config /d/admin/web.config
# Static placeholder (iisnode yokken /admin/ -> 200)
[ -f index.html ] && cp index.html /d/admin/index.html
# Production env (also as .env so it loads even when NODE_ENV is unset)
[ -f .env.production ] && cp .env.production /d/admin/.env.production
[ -f .env.production ] && cp .env.production /d/admin/.env
# iisnode named-pipe PORT fix: don't parseInt the PORT (it's a pipe path on Windows IIS).
if [ -f /d/admin/server.js ]; then
  sed -i 's/parseInt(process\.env\.PORT,\s*10)/(process.env.PORT)/g' /d/admin/server.js
  echo "  (patched admin/server.js for iisnode named-pipe PORT)"
fi

# Web (static export)
if [ -d "$ROOT/web" ]; then
  echo "-> Web build (static)"
  cd "$ROOT/web"
  # Phase 182: prod build must NOT pick up dev .env.local (it overrides
  # .env.production in Next.js and would bake http://localhost:3000 into
  # sitemap.xml / robots.txt / metadataBase). Hide it during the build.
  ENVLOCAL_HIDDEN=""
  if [ -f .env.local ]; then mv .env.local .env.local.deploybak && ENVLOCAL_HIDDEN=1; fi
  NEXT_PUBLIC_SITE_URL="https://yapgitsin.tr" NEXT_PUBLIC_API_URL="https://api.yapgitsin.tr" npm run build > /dev/null 2>&1 || echo "  (web build skipped/failed)"
  if [ -n "$ENVLOCAL_HIDDEN" ]; then mv .env.local.deploybak .env.local; fi
  if [ -d out ]; then
    mv /d/web "/d/web.bak.$BACKUP_TS" 2>/dev/null || true
    mkdir -p /d/web
    cp -r out/* /d/web/
  fi
fi

# Flutter web
if [ -d "$ROOT/hizmet_app" ]; then
  echo "-> Flutter web build"
  cd "$ROOT/hizmet_app"
  flutter build web --release --dart-define=API_URL=https://api.yapgitsin.tr > /dev/null 2>&1 || echo "  (flutter build skipped/failed)"
  if [ -d build/web ]; then
    mv /d/app "/d/app.bak.$BACKUP_TS" 2>/dev/null || true
    mkdir -p /d/app
    cp -r build/web/* /d/app/
  fi
fi

# Cleanup backups (only after successful copy)
echo "-> Cleanup backups"
rm -rf /d/backend.bak.* /d/admin.bak.* /d/app.bak.* /d/web.bak.* 2>/dev/null || true

echo ""
echo "Deploy complete. Sizes:"
du -sh /d/backend /d/admin /d/app /d/web 2>&1 | grep -v "No such" || true
echo ""
echo "NEXT STEP: On server, run 'npm install --omit=dev' inside D:\\backend"
