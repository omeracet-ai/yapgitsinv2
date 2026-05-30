import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { GeminiClient } from './gemini.client';

interface WorkerLite {
  id: string;
  fullName?: string;
  workerBio?: string | null;
  workerCategories?: string[] | null;
  city?: string | null;
  averageRating?: number;
  hourlyRateMin?: number | null;
  hourlyRateMax?: number | null;
}

interface CacheEntry {
  ids: string[];
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 dk

/**
 * Phase 281: migrated from Anthropic Opus to Gemini 2.5 Flash.
 */
@Injectable()
export class SemanticSearchService {
  private readonly logger = new Logger(SemanticSearchService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly gemini: GeminiClient) {}

  isEnabled(): boolean {
    return this.gemini.isAvailable();
  }

  private cacheKey(query: string, ids: string[]): string {
    const h = createHash('sha256');
    h.update(query.trim().toLowerCase());
    h.update('|');
    h.update(ids.slice().sort().join(','));
    return h.digest('hex');
  }

  /**
   * Verilen query'ye göre worker listesini Gemini ile yeniden sırala.
   * Env yoksa veya hata olursa orijinal sıralama döner.
   */
  async rerankWorkers<T extends WorkerLite>(
    query: string,
    workers: T[],
  ): Promise<T[]> {
    if (!this.gemini.isAvailable() || !query?.trim() || workers.length === 0)
      return workers;

    const ids = workers.map((w) => w.id);
    const key = this.cacheKey(query, ids);
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) {
      return this.applyOrder(workers, cached.ids);
    }

    const compact = workers.map((w) => ({
      id: w.id,
      name: w.fullName ?? '',
      cats: Array.isArray(w.workerCategories) ? w.workerCategories : [],
      bio: (w.workerBio ?? '').slice(0, 200),
      city: w.city ?? '',
      rating: w.averageRating ?? 0,
      rate: [w.hourlyRateMin, w.hourlyRateMax],
    }));

    const userPrompt = `Müşteri arama sorgusu: "${query}"

Aşağıda usta listesi var. Sorguya en uygun ustaları ÖNCE gelecek şekilde id sırasını yeniden düzenle.
SADECE geçerli JSON dizisi döndür: ["id1","id2",...]. Markdown/açıklama yok.

Ustalar:
${JSON.stringify(compact)}`;

    try {
      const raw = await this.gemini.generate({
        systemText:
          'Sen bir hizmet marketplace arama yeniden sıralayıcısısın. Sadece JSON id dizisi döner.',
        userText: userPrompt,
        maxOutputTokens: Math.min(2048, 64 + ids.length * 50),
        temperature: 0.2,
      });
      const parsed = this.gemini.parseJsonLoose<unknown>(raw);
      if (!Array.isArray(parsed)) return workers;
      const orderedIds = parsed.filter(
        (x): x is string => typeof x === 'string',
      );

      this.cache.set(key, { ids: orderedIds, expiresAt: now + CACHE_TTL_MS });
      if (this.cache.size > 500) {
        for (const [k, v] of this.cache) {
          if (v.expiresAt <= now) this.cache.delete(k);
        }
      }

      return this.applyOrder(workers, orderedIds);
    } catch (err) {
      this.logger.warn(`rerankWorkers failed: ${(err as Error).message}`);
      return workers;
    }
  }

  private applyOrder<T extends WorkerLite>(
    workers: T[],
    orderedIds: string[],
  ): T[] {
    const map = new Map(workers.map((w) => [w.id, w]));
    const reordered = orderedIds
      .map((id) => map.get(id))
      .filter((w): w is T => !!w);
    const seen = new Set(orderedIds);
    for (const w of workers) if (!seen.has(w.id)) reordered.push(w);
    return reordered;
  }
}
