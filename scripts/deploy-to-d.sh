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
# Phase 168: production env (DB creds, JWT secret) for runtime
[ -f .env.production ] && cp .env.production /d/backend/.env.production
# Phase 178: iisnode boot-check wrapper + minimal sanity test endpoint
[ -f boot-check.js ] && cp boot-check.js /d/backend/boot-check.js
[ -f IISNODE_DEBUG.md ] && cp IISNODE_DEBUG.md /d/backend/IISNODE_DEBUG.md
# _test/ stays under D:\backend (not in repo); recreate if missing
if [ ! -d /d/backend/_test ]; then
  mkdir -p /d/backend/_test
fi

# Admin (Next.js standalone)
echo "-> Admin build (standalone)"
cd "$ROOT/admin-panel"
npm run build > /dev/null
mv /d/admin "/d/admin.bak.$BACKUP_TS" 2>/dev/null || true
mkdir -p /d/admin
if [ -d ".next/standalone" ]; then
  cp -r .next/standalone/. /d/admin/
  mkdir -p /d/admin/.next
  cp -r .next/static /d/admin/.next/
  [ -d public ] && cp -r public /d/admin/ || true
else
  echo "WARN: standalone missing, falling back to full .next"
  cp -r .next /d/admin/
  [ -d public ] && cp -r public /d/admin/ || true
fi
# Phase 166: IIS + iisnode bridge (overwrite any standalone-bundled web.config)
[ -f web.config ] && cp web.config /d/admin/web.config

# Web (static export)
if [ -d "$ROOT/web" ]; then
  echo "-> Web build (static)"
  cd "$ROOT/web"
  npm run build > /dev/null 2>&1 || echo "  (web build skipped/failed)"
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
  flutter build web --release --base-href /app/ > /dev/null 2>&1 || echo "  (flutter build skipped/failed)"
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
