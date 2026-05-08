import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

const FRAUD_SYSTEM = `You are a fraud detection assistant for a Turkish service marketplace (Yapgitsin).
Detect spam, scams, fake listings, suspicious phone/contact extraction, money laundering signals,
adult content, hate speech, or impersonation. Output STRICT JSON only.`;

export interface FraudResult {
  score: number;       // 0-100
  reasons: string[];   // short Turkish reasons
}

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);
  private readonly client: Anthropic | null;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('ANTHROPIC_API_KEY');
    this.client = key ? new Anthropic({ apiKey: key }) : null;
  }

  async analyzeJobListing(title: string, description: string): Promise<FraudResult> {
    return this.analyze(
      `İŞ İLANI:\nBaşlık: ${title}\nAçıklama: ${description}`,
    );
  }

  async analyzeReview(comment: string): Promise<FraudResult> {
    return this.analyze(`KULLANICI YORUMU:\n${comment}`);
  }

  async analyzeBio(bio: string): Promise<FraudResult> {
    return this.analyze(`USTA PROFİL BIO:\n${bio}`);
  }

  private async analyze(content: string): Promise<FraudResult> {
    if (!this.client) return { score: 0, reasons: [] };
    try {
      const response = await this.client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 512,
        system: [
          {
            type: 'text',
            text:
              FRAUD_SYSTEM +
              '\n\nReturn ONLY: {"score": <0-100>, "reasons": ["<kısa>","..."]}',
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: `${content}\n\nBu içerik sahte/spam/dolandırıcılık olabilir mi? Skor (0=temiz, 100=kesin sahte) ve gerekçeleri JSON döndür.`,
          },
        ],
      });
      const block = response.content.find((b) => b.type === 'text');
      const raw = block ? block.text : '';
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      const parsed = JSON.parse(cleaned) as { score?: number; reasons?: string[] };
      const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
      const reasons = Array.isArray(parsed.reasons)
        ? parsed.reasons.filter((r) => typeof r === 'string').slice(0, 8)
        : [];
      return { score, reasons };
    } catch (e) {
      this.logger.warn(`Fraud analyze failed: ${(e as Error).message}`);
      return { score: 0, reasons: [] };
    }
  }
}
