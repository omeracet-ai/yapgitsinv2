import { Logger } from '@nestjs/common';
import type { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Phase 170 — Cache katmanı yapılandırması.
 *
 * REDIS_URL env'i SET ise → Redis store (cache-manager v7 / Keyv üzerinden).
 * SET değilse VEYA Redis bağlantısı kurulamazsa → in-memory store (graceful fallback).
 *
 * Dev makinesinde Redis yok; uygulama her durumda boot olur, asla patlamaz.
 * Prod (Windows server) için: Memurai veya ayrı Redis servisi — bkz docs/REDIS_SETUP.md
 */

const logger = new Logger('CacheConfig');

/** Default TTL — 60 saniye (ms). Route bazında @CacheTTL ile override edilir. */
export const DEFAULT_CACHE_TTL = 60_000;
/** In-memory store için max entry sayısı. */
const MEMORY_MAX_ENTRIES = 1000;

export const cacheConfigAsync: CacheModuleAsyncOptions = {
  isGlobal: true,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {
    const redisUrl = config.get<string>('REDIS_URL')?.trim();

    if (!redisUrl) {
      logger.log('REDIS_URL tanımlı değil — in-memory cache kullanılıyor.');
      return { ttl: DEFAULT_CACHE_TTL, max: MEMORY_MAX_ENTRIES };
    }

    // Redis store'u dene; bağlantı kurulamazsa in-memory'e düş.
    try {
      // Lazy import — @keyv/redis yoksa (ileride kaldırılırsa) app yine boot olur.
      const { createKeyv } = await import('@keyv/redis');
      const keyv = createKeyv(redisUrl);
      // Keyv bağlantı hatalarını yut — yoksa unhandled error app'i düşürür.
      keyv.on('error', (err: unknown) => {
        logger.warn(
          `Redis cache bağlantı hatası (in-memory'e fallback davranışı için diğer istekler etkilenmez): ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      });
      logger.log(`Redis cache aktif: ${redisUrl.replace(/\/\/[^@]*@/, '//***@')}`);
      return { ttl: DEFAULT_CACHE_TTL, stores: [keyv] };
    } catch (err) {
      logger.warn(
        `Redis cache başlatılamadı, in-memory cache'e düşülüyor: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return { ttl: DEFAULT_CACHE_TTL, max: MEMORY_MAX_ENTRIES };
    }
  },
};
