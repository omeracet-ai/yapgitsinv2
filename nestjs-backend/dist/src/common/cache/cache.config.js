"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheConfigAsync = exports.DEFAULT_CACHE_TTL = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const logger = new common_1.Logger('CacheConfig');
exports.DEFAULT_CACHE_TTL = 60_000;
const MEMORY_MAX_ENTRIES = 1000;
exports.cacheConfigAsync = {
    isGlobal: true,
    imports: [config_1.ConfigModule],
    inject: [config_1.ConfigService],
    useFactory: async (config) => {
        const redisUrl = config.get('REDIS_URL')?.trim();
        if (!redisUrl) {
            logger.log('REDIS_URL tanımlı değil — in-memory cache kullanılıyor.');
            return { ttl: exports.DEFAULT_CACHE_TTL, max: MEMORY_MAX_ENTRIES };
        }
        try {
            const { createKeyv } = await import('@keyv/redis');
            const keyv = createKeyv(redisUrl);
            keyv.on('error', (err) => {
                logger.warn(`Redis cache bağlantı hatası (in-memory'e fallback davranışı için diğer istekler etkilenmez): ${err instanceof Error ? err.message : String(err)}`);
            });
            logger.log(`Redis cache aktif: ${redisUrl.replace(/\/\/[^@]*@/, '//***@')}`);
            return { ttl: exports.DEFAULT_CACHE_TTL, stores: [keyv] };
        }
        catch (err) {
            logger.warn(`Redis cache başlatılamadı, in-memory cache'e düşülüyor: ${err instanceof Error ? err.message : String(err)}`);
            return { ttl: exports.DEFAULT_CACHE_TTL, max: MEMORY_MAX_ENTRIES };
        }
    },
};
//# sourceMappingURL=cache.config.js.map