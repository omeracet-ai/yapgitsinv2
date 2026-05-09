import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export type TranslateLang = 'tr' | 'en' | 'az';

const LANG_LABELS: Record<TranslateLang, string> = {
  tr: 'Turkish',
  en: 'English',
  az: 'Azerbaijani',
};

/**
 * Phase 153: AI chat translate service.
 * Wraps Anthropic Claude. Returns 503 when ANTHROPIC_API_KEY is missing
 * so callers and frontend can degrade gracefully.
 */
@Injectable()
export class TranslateService {
  private readonly client: Anthropic | null;

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.client = key ? new Anthropic({ apiKey: key }) : null;
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async translate(text: string, targetLang: TranslateLang): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI çeviri servisi şu anda kullanılamıyor (ANTHROPIC_API_KEY eksik).',
      );
    }
    const trimmed = (text ?? '').trim();
    if (!trimmed) return '';

    const label = LANG_LABELS[targetLang];
    try {
      const response = await this.client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: `You are a professional translator. Translate user messages to ${label}, preserving meaning, tone, register, and casual/formal style. Return ONLY the translated text — no quotes, no explanations, no language labels.`,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: trimmed }],
      });

      const block = response.content.find((b) => b.type === 'text');
      return block ? block.text.trim() : '';
    } catch {
      throw new InternalServerErrorException('Çeviri başarısız oldu');
    }
  }
}
