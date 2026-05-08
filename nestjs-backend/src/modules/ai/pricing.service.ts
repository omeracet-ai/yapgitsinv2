import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import * as crypto from 'crypto';

export interface PriceSuggestion {
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
  currency: 'TRY';
}

interface CacheEntry {
  value: PriceSuggestion;
  expiresAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_CACHE_ENTRIES = 500;

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);
  private readonly client: Anthropic | null;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  private hashKey(input: {
    category: string;
    location?: string;
    description: string;
    customerType?: string;
  }): string {
    const norm = `${input.category}|${input.location ?? ''}|${input.description.trim().toLowerCase()}|${input.customerType ?? ''}`;
    return crypto.createHash('sha1').update(norm).digest('hex');
  }

  private getFromCache(key: string): PriceSuggestion | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  private setCache(key: string, value: PriceSuggestion): void {
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  async suggestPrice(input: {
    category: string;
    location?: string;
    description: string;
    photos?: string[];
    customerType?: string;
  }): Promise<PriceSuggestion> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI fiyat servisi şu anda kullanılamıyor (ANTHROPIC_API_KEY eksik)',
      );
    }

    const key = this.hashKey(input);
    const cached = this.getFromCache(key);
    if (cached) return cached;

    const prompt = `Türkiye pazarında ${input.category} kategorisinde, ${input.location ?? 'belirtilmemiş bölge'} bölgesinde, "${input.description}" açıklamalı bir hizmet için adil fiyat aralığı öner.

- 2026 Türkiye fiyatlarını kullan (TRY)
- ${input.category} için tipik saatlik veya proje bazlı fiyatlar
- Şehir bazında düzeltme uygula (İstanbul/Ankara/İzmir +%15-20, Anadolu şehirleri -%10)
- Confidence: açıklama detaylı ve kategori netse "high", makul ipuçları varsa "medium", çok belirsizse "low"
- Reasoning Türkçe, 1-2 cümle, fiyatın neden bu aralıkta olduğunu özetle

YALNIZCA aşağıdaki şemada geçerli JSON dön (markdown veya açıklama metni EKLEME):
{"minPrice": <number>, "maxPrice": <number>, "medianPrice": <number>, "confidence": "low"|"medium"|"high", "reasoning": "<turkish>"}`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 512,
        system: [
          {
            type: 'text',
            text: 'Sen Türkiye pazarına hakim bir fiyat danışmanısın. SADECE geçerli JSON dönersin.',
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      const raw = textBlock && textBlock.type === 'text' ? textBlock.text : '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI yanıtı JSON içermiyor');
      }
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

      const result: PriceSuggestion = {
        minPrice: Math.max(0, Number(parsed.minPrice) || 0),
        maxPrice: Math.max(0, Number(parsed.maxPrice) || 0),
        medianPrice: Math.max(0, Number(parsed.medianPrice) || 0),
        confidence:
          parsed.confidence === 'high' || parsed.confidence === 'low'
            ? (parsed.confidence as 'high' | 'low')
            : 'medium',
        reasoning: String(parsed.reasoning ?? '').trim(),
        currency: 'TRY',
      };

      this.setCache(key, result);
      return result;
    } catch (err) {
      this.logger.error(
        `suggestPrice failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new ServiceUnavailableException('AI fiyat önerisi üretilemedi');
    }
  }
}
