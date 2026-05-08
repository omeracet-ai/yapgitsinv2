/**
 * @yapgitsin/api-client — type-safe Yapgitsin backend SDK.
 *
 * The `paths` types are auto-generated from the backend Swagger spec.
 * Run `npm run generate` (or `bash scripts/gen-sdk.sh`) to refresh.
 */
import createClient, { type Client } from 'openapi-fetch';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { paths } from './generated/types';

export type YapgitsinClient = Client<paths>;

export function createYapgitsinClient(
  baseUrl: string,
  token?: string,
): YapgitsinClient {
  return createClient<paths>({
    baseUrl,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export type { paths } from './generated/types';
