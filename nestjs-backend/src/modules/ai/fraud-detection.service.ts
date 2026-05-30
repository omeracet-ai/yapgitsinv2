import { Injectable, Logger } from '@nestjs/common';
import { GeminiClient } from './gemini.client';

const FRAUD_SYSTEM = `You are a fraud detection assistant for a Turkish service marketplace (Yapgitsin).
Detect spam, scams, fake listings, suspicious phone/contact extraction, money laundering signals,
adult content, hate speech, or impersonation. Output STRICT JSON only.

Return ONLY: {"score": <0-100>, "reasons": ["<kısa>","..."]}`;

export interface FraudResult {
  score: number;
  reasons: string[];
}

/**
 * Phase 281: migrated from Anthropic Opus to Gemini 2.5 Flash.
 */
@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);

  constructor(private readonly gemini: GeminiClient) {}

  async analyzeJobListing(
    title: string,
    description: string,
  ): Promise<FraudResult> {
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
    if (!this.gemini.isAvailable()) return { score: 0, reasons: [] };
    try {
      const raw = await this.gemini.generate({
        systemText: FRAUD_SYSTEM,
        userText: `${content}\n\nBu içerik sahte/spam/dolandırıcılık olabilir mi? Skor (0=temiz, 100=kesin sahte) ve gerekçeleri JSON döndür.`,
        maxOutputTokens: 512,
        temperature: 0.2,
      });
      const parsed = this.gemini.parseJsonLoose<{
        score?: number;
        reasons?: string[];
      }>(raw);
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
