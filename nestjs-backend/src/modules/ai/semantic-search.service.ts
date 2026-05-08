import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';

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

@Injectable()
export class SemanticSearchService {
  private readonly logger = new Logger(SemanticSearchService.name);
  private readonly client: Anthropic | null;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  /** Anthropic env var yoksa false. */
  isEnabled(): boolean {
    return this.client !== null;
  }

  private cacheKey(query: string, ids: string[]): string {
    const h = createHash('sha256');
    h.update(query.trim().toLowerCase());
    h.update('|');
    h.update(ids.slice().sort().join(','));
    return h.digest('hex');
  }

  /**
   * Verilen query'ye göre worker listesini Claude ile yeniden sırala.
   * Env yoksa orijinal sıralama döner. Hata olursa orijinal döner.
   */
  async rerankWorkers<T extends WorkerLite>(
    query: string,
    workers: T[],
  ): Promise<T[]> {
    if (!this.client || !query?.trim() || workers.length === 0) return workers;

    const ids = workers.map((w) => w.id);
    const key = this.cacheKey(query, ids);
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) {
      const map = new Map(workers.map((w) => [w.id, w]));
      const reordered = cached.ids
        .map((id) => map.get(id))
        .filter((w): w is T => !!w);
      // any IDs not in cached order go at end
      const seen = new Set(cached.ids);
      for (const w of workers) if (!seen.has(w.id)) reordered.push(w);
      return reordered;
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
      const resp = await this.client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: Math.min(2048, 64 + ids.length * 50),
        system: [
          {
            type: 'text',
            text: 'Sen bir hizmet marketplace arama yeniden sıralayıcısısın. Sadece JSON id dizisi döner.',
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userPrompt }],
      });

      const textBlock = resp.content.find((b) => b.type === 'text');
      const raw = textBlock ? textBlock.text : '';
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      const parsed = JSON.parse(cleaned) as unknown;
      if (!Array.isArray(parsed)) return workers;
      const orderedIds = parsed.filter(
        (x): x is string => typeof x === 'string',
      );

      this.cache.set(key, { ids: orderedIds, expiresAt: now + CACHE_TTL_MS });
      // Lightweight cache eviction
      if (this.cache.size > 500) {
        for (const [k, v] of this.cache) {
          if (v.expiresAt <= now) this.cache.delete(k);
        }
      }

      const map = new Map(workers.map((w) => [w.id, w]));
      const reordered = orderedIds
        .map((id) => map.get(id))
        .filter((w): w is T => !!w);
      const seen = new Set(orderedIds);
      for (const w of workers) if (!seen.has(w.id)) reordered.push(w);
      return reordered;
    } catch (err) {
      this.logger.warn(`rerankWorkers failed: ${(err as Error).message}`);
      return workers;
    }
  }
}
