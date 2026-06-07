import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnthropicClient } from './anthropic.client';
import { GeminiClient } from './gemini.client';

// Phase 444 — Unified AI provider with primary/fallback routing.
//
// Default: Anthropic (Claude Haiku 4.5) primary, Gemini Flash fallback.
// Switch via env: AI_PRIMARY=gemini → Gemini primary, Anthropic fallback.
//
// Existing services depend on AiProvider with the same `generate()` /
// `parseJsonLoose()` / `isAvailable()` surface — drop-in replacement for
// GeminiClient (Phase 281's only client).

export interface AiHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiGenerateOptions {
  systemText: string;
  userText: string;
  history?: AiHistoryTurn[];
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

type Provider = 'anthropic' | 'gemini';

@Injectable()
export class AiProvider {
  private readonly logger = new Logger(AiProvider.name);
  private readonly primary: Provider;
  private readonly fallback: Provider;

  constructor(
    private readonly config: ConfigService,
    private readonly anthropic: AnthropicClient,
    private readonly gemini: GeminiClient,
  ) {
    const raw = (config.get<string>('AI_PRIMARY') || 'anthropic').toLowerCase();
    this.primary = raw === 'gemini' ? 'gemini' : 'anthropic';
    this.fallback = this.primary === 'anthropic' ? 'gemini' : 'anthropic';
    this.logger.log(
      `AI primary=${this.primary} fallback=${this.fallback}`,
    );
  }

  isAvailable(): boolean {
    return this.anthropic.isAvailable() || this.gemini.isAvailable();
  }

  /** Primary-first; on any error falls back to the other if available. */
  async generate(opts: AiGenerateOptions): Promise<string> {
    const order: Provider[] =
      this.primary === 'anthropic'
        ? ['anthropic', 'gemini']
        : ['gemini', 'anthropic'];
    let lastErr: unknown = null;
    for (const p of order) {
      const client = p === 'anthropic' ? this.anthropic : this.gemini;
      if (!client.isAvailable()) continue;
      try {
        return await client.generate(opts);
      } catch (err) {
        lastErr = err;
        this.logger.warn(
          `${p} failed (${(err as Error).message}) — trying fallback`,
        );
      }
    }
    throw lastErr ??
      new Error('AI servisi kullanılamıyor (anahtar eksik veya hata).');
  }

  /** Tolerant JSON extraction — strips ```json fences and grabs the first object/array. */
  parseJsonLoose<T = Record<string, unknown>>(raw: string): T {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    const candidate =
      objMatch && (!arrMatch || objMatch.index! <= arrMatch.index!)
        ? objMatch[0]
        : (arrMatch?.[0] ?? cleaned);
    return JSON.parse(candidate) as T;
  }
}
