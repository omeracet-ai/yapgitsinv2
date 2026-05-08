#!/usr/bin/env bash
# Phase 108 — Generate TypeScript SDK from backend OpenAPI spec.
# Requires: backend deps installed, openapi-typescript available via npx.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/nestjs-backend"
npm run openapi:export

cd "$ROOT"
mkdir -p packages/api-client/generated
npx --yes openapi-typescript@^7 nestjs-backend/openapi.json \
  -o packages/api-client/generated/types.ts

echo "SDK generated: packages/api-client/generated/types.ts"
