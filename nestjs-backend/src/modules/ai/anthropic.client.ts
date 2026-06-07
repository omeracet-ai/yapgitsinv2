import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

// Phase 444 — Anthropic client mirrors GeminiClient API surface so AiProvider
// can swap between the two without changing caller code.
export const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
export const ANTHROPIC_MAX_INPUT_CHARS = 8000;
export const ANTHROPIC_DEFAULT_OUTPUT_TOKENS = 1024;

export interface AnthropicHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicGenerateOptions {
  systemText: string;
  userText: string;
  history?: AnthropicHistoryTurn[];
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

@Injectable()
export class AnthropicClient {
  private readonly logger = new Logger(AnthropicClient.name);
  private client: Anthropic | null = null;

  constructor(private readonly config: ConfigService) {}

  isAvailable(): boolean {
    return Boolean(this.config.get<string>('ANTHROPIC_API_KEY'));
  }

  private getClient(): Anthropic {
    if (this.client) return this.client;
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'AI servisi şu anda kullanılamıyor (ANTHROPIC_API_KEY eksik).',
      );
    }
    this.client = new Anthropic({ apiKey, timeout: 30_000 });
    return this.client;
  }

  async generate(opts: AnthropicGenerateOptions): Promise<string> {
    const client = this.getClient();
    const history = (opts.history ?? []).slice(-8).map((h) => ({
      role: h.role,
      content: (h.content ?? '').slice(0, 2000),
    }));
    const userText = (opts.userText ?? '').slice(
      0,
      ANTHROPIC_MAX_INPUT_CHARS,
    );

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      opts.timeoutMs ?? 30_000,
    );

    try {
      const resp = await client.messages.create(
        {
          model: ANTHROPIC_MODEL,
          system: opts.systemText,
          messages: [...history, { role: 'user', content: userText }],
          max_tokens: opts.maxOutputTokens ?? ANTHROPIC_DEFAULT_OUTPUT_TOKENS,
          temperature: opts.temperature ?? 0.7,
        },
        { signal: controller.signal },
      );
      const parts = resp.content ?? [];
      return parts
        .map((p) => ('text' in p ? p.text : ''))
        .join('')
        .trim();
    } finally {
      clearTimeout(timeout);
    }
  }

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
