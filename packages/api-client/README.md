# @yapgitsin/api-client

Auto-generated, type-safe TypeScript SDK for the Yapgitsin backend.
Path strings, query/body shapes, and response payloads are all type-checked
against the live backend OpenAPI (Swagger) spec.

## Install

```bash
npm install @yapgitsin/api-client openapi-fetch
```

## Usage

```ts
import { createYapgitsinClient } from '@yapgitsin/api-client';

const client = createYapgitsinClient('https://api.yapgitsin.tr', token);

const { data, error } = await client.GET('/users/me');
if (error) throw error;
console.log(data.fullName);
```

## Regenerate types

The `paths` / `components` types are produced from the backend OpenAPI spec.

```bash
# from repo root
bash scripts/gen-sdk.sh
```

This:
1. Boots NestJS in **preview** mode (no `listen`) and writes `nestjs-backend/openapi.json`
   (`npm run openapi:export` in `nestjs-backend/`).
2. Runs `openapi-typescript` to produce `packages/api-client/generated/types.ts`.

Run it after any backend route/DTO change, then `npm run build` here.

## Build

```bash
npm install
npm run build      # tsc -> dist/
```

Outputs `dist/index.js` + `dist/index.d.ts` (declared in `main` / `types`).

## Publish

Locally:

```bash
npm run generate          # refresh types from backend
npm version patch         # or minor / major
npm publish --access public   # prepublishOnly runs the build
```

Verify packaging without publishing:

```bash
npm pack --dry-run
```

CI: `.github/workflows/sdk-publish.yml` (`workflow_dispatch`) does the same —
regenerate, bump, build, publish. Requires the `NPM_TOKEN` repo secret. Pass
`dry_run: true` for a `npm publish --dry-run` rehearsal.
