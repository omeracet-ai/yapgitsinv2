import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AiProvider } from './ai-provider.service';

export type TranslateLang = 'tr' | 'en' | 'az';

const LANG_LABELS: Record<TranslateLang, string> = {
  tr: 'Turkish',
  en: 'English',
  az: 'Azerbaijani',
};

/**
 * AI chat translate service.
 * Phase 281: migrated from Anthropic Opus to Gemini 2.5 Flash.
 * Returns 503 when GEMINI_API_KEY is missing so callers can degrade gracefully.
 */
@Injectable()
export class TranslateService {
  private readonly logger = new Logger(TranslateService.name);

  constructor(private readonly gemini: AiProvider) {}

  isAvailable(): boolean {
    return this.gemini.isAvailable();
  }

  async translate(text: string, targetLang: TranslateLang): Promise<string> {
    const trimmed = (text ?? '').trim();
    if (!trimmed) return '';
    const label = LANG_LABELS[targetLang];

    try {
      const out = await this.gemini.generate({
        systemText: `You are a professional translator. Translate user messages to ${label}, preserving meaning, tone, register, and casual/formal style. Return ONLY the translated text — no quotes, no explanations, no language labels.`,
        userText: trimmed,
        maxOutputTokens: 1024,
        temperature: 0.3,
      });
      return out.trim();
    } catch (err) {
      this.logger.warn(
        `translate failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new InternalServerErrorException('Çeviri başarısız oldu');
    }
  }
}
