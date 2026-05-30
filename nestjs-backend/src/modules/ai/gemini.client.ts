import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Phase 281 — central Gemini 2.5 Flash client.
// All Yapgitsin AI surface uses this; Anthropic SDK is no longer imported.
// Opus is reserved for Müdür orchestration (outside the app).
export const GEMINI_MODEL = 'gemini-2.5-flash';
export const GEMINI_MAX_INPUT_CHARS = 8000; // ~2k tokens
export const GEMINI_DEFAULT_OUTPUT_TOKENS = 1024;

export interface GeminiHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface GeminiGenerateOptions {
  systemText: string;
  userText: string;
  history?: GeminiHistoryTurn[];
  maxOutputTokens?: number;
  temperature?: number;
  /** Forwarded to AbortController timeout (default 30s). */
  timeoutMs?: number;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

@Injectable()
export class GeminiClient {
  private readonly logger = new Logger(GeminiClient.name);

  constructor(private readonly config: ConfigService) {}

  isAvailable(): boolean {
    return Boolean(this.config.get<string>('GEMINI_API_KEY'));
  }

  /** Single-shot or multi-turn generation. Caller handles validation/parsing. */
  async generate(opts: GeminiGenerateOptions): Promise<string> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'AI servisi şu anda kullanılamıyor (GEMINI_API_KEY eksik).',
      );
    }

    const history = (opts.history ?? []).slice(-8).map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: (h.content ?? '').slice(0, 2000) }],
    }));

    const contents = [
      ...history,
      {
        role: 'user',
        parts: [
          { text: (opts.userText ?? '').slice(0, GEMINI_MAX_INPUT_CHARS) },
        ],
      },
    ];

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}` +
      `:generateContent?key=${encodeURIComponent(apiKey)}`;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      opts.timeoutMs ?? 30_000,
    );

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: opts.systemText }] },
          contents,
          generationConfig: {
            maxOutputTokens:
              opts.maxOutputTokens ?? GEMINI_DEFAULT_OUTPUT_TOKENS,
            temperature: opts.temperature ?? 0.7,
          },
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Gemini HTTP ${res.status}: ${body.slice(0, 200)}`);
      }

      const data = (await res.json()) as GeminiResponse;
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      return parts
        .map((p) => p.text ?? '')
        .join('')
        .trim();
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Tolerant JSON extraction — strips ```json fences and grabs the first object/array. */
  parseJsonLoose<T = Record<string, unknown>>(raw: string): T {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    // Try object first, then array.
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    const candidate =
      objMatch && (!arrMatch || objMatch.index! <= arrMatch.index!)
        ? objMatch[0]
        : (arrMatch?.[0] ?? cleaned);
    return JSON.parse(candidate) as T;
  }
}
