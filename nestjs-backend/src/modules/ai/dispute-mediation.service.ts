import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { GeminiClient } from './gemini.client';

const SYSTEM = `Sen bir Türk hizmet pazarı (Yapgitsin) için anlaşmazlık ön-analiz asistanısın.
Şikayetin taraflara adil olup olmadığını, sahte iddia (fraud) riskini ve önerilen çözümü değerlendir.
SADECE STRICT JSON döndür. Türkçe reasoning yaz.

Format: {"fairnessScore": <0-100>, "fraudRisk": "low|medium|high", "suggestedAction": "refund|partial_refund|cancel|dismiss|escalate", "reasoning": "<kısa türkçe>"}`;

export type SuggestedAction =
  | 'refund'
  | 'partial_refund'
  | 'cancel'
  | 'dismiss'
  | 'escalate';

export interface DisputeAnalysis {
  fairnessScore: number;
  fraudRisk: 'low' | 'medium' | 'high';
  suggestedAction: SuggestedAction;
  reasoning: string;
  analyzedAt: string;
}

export interface AnalyzeDisputeInput {
  type: string;
  description: string;
  againstUserId: string;
  jobId?: string | null;
  bookingId?: string | null;
  contextData?: Record<string, unknown>;
}

interface CacheEntry {
  result: DisputeAnalysis;
  expiresAt: number;
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Phase 281: migrated from Anthropic Opus to Gemini 2.5 Flash.
 */
@Injectable()
export class DisputeMediationService {
  private readonly logger = new Logger(DisputeMediationService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly gemini: GeminiClient) {}

  private cacheKey(type: string, description: string): string {
    return createHash('sha256').update(`${type}::${description}`).digest('hex');
  }

  async analyzeDispute(
    input: AnalyzeDisputeInput,
  ): Promise<DisputeAnalysis | null> {
    if (!this.gemini.isAvailable()) return null;
    const key = this.cacheKey(input.type, input.description);
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > now) return hit.result;

    try {
      const ctx = input.contextData
        ? `\nEK BAĞLAM: ${JSON.stringify(input.contextData)}`
        : '';
      const ref = input.jobId
        ? `\nİŞ İD: ${input.jobId}`
        : input.bookingId
          ? `\nRANDEVU İD: ${input.bookingId}`
          : '';
      const raw = await this.gemini.generate({
        systemText: SYSTEM,
        userText: `ŞİKAYET TÜRÜ: ${input.type}\nAÇIKLAMA: ${input.description}${ref}${ctx}\n\nBu anlaşmazlık için fairness (0=karşı tarafa adil, 100=şikayetçi haklı), fraud risk ve önerilen çözüm. JSON dön.`,
        maxOutputTokens: 700,
        temperature: 0.3,
      });
      const parsed = this.gemini.parseJsonLoose<Partial<DisputeAnalysis>>(raw);

      const result: DisputeAnalysis = {
        fairnessScore: Math.max(
          0,
          Math.min(100, Number(parsed.fairnessScore) || 50),
        ),
        fraudRisk:
          parsed.fraudRisk === 'high' || parsed.fraudRisk === 'medium'
            ? parsed.fraudRisk
            : 'low',
        suggestedAction: this.normalizeAction(parsed.suggestedAction),
        reasoning:
          typeof parsed.reasoning === 'string'
            ? parsed.reasoning.slice(0, 800)
            : '',
        analyzedAt: new Date().toISOString(),
      };

      this.cache.set(key, { result, expiresAt: now + CACHE_TTL_MS });
      if (this.cache.size > 500) {
        for (const [k, v] of this.cache) {
          if (v.expiresAt <= now) this.cache.delete(k);
        }
      }
      return result;
    } catch (e) {
      this.logger.warn(`Dispute analyze failed: ${(e as Error).message}`);
      return null;
    }
  }

  private normalizeAction(v: unknown): SuggestedAction {
    const allowed: SuggestedAction[] = [
      'refund',
      'partial_refund',
      'cancel',
      'dismiss',
      'escalate',
    ];
    return (allowed as string[]).includes(v as string)
      ? (v as SuggestedAction)
      : 'escalate';
  }
}
