# @yapgitsin/api-client

Auto-generated, type-safe TypeScript SDK for the Yapgitsin backend (Phase 108).

## Generate

```bash
# from repo root
bash scripts/gen-sdk.sh
```

This:
1. Boots NestJS in offline mode and writes `nestjs-backend/openapi.json`.
2. Runs `openapi-typescript` to produce `packages/api-client/generated/types.ts`.

Both artifacts are gitignored — regenerate on backend API changes.

## Usage

```ts
import { createYapgitsinClient } from '@yapgitsin/api-client';

const client = createYapgitsinClient('https://api.yapgitsin.tr', token);

const { data, error } = await client.GET('/users/me');
if (error) throw error;
console.log(data.fullName);
```

Path strings, query/body shapes, and response payloads are all type-checked
against the live backend Swagger spec.

## Refresh workflow

After backend route/DTO changes:

```bash
bash scripts/gen-sdk.sh
```

Web/admin imports pick up the new types on next `tsc` run.
