import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { GeminiClient, GeminiHistoryTurn } from './gemini.client';

// Phase 281: full migration off Anthropic — every AI surface here uses
// Gemini 2.5 Flash. Opus stays reserved for Müdür orchestration (outside the app).
const SYSTEM_PROMPT = `You are a helpful AI assistant for a service marketplace platform called Hizmet.
This platform connects customers with service providers for jobs like home repairs, cleaning, tutoring, and more.
Be concise, practical, and focused on helping users of this marketplace.`;

const GEMINI_SYSTEM_PROMPT = `Sen Yapgitsin marketplace platformunun yardımcı asistanısın.
Türkçe yanıt ver (kullanıcı İngilizce yazarsa İngilizce yanıt ver). Kısa, net ve pratik ol.
Platform: müşteriler iş ilanı açar, ustalar teklif verir; ödeme platform dışı (escrow opsiyonel),
her hesap 100 kredi ile başlar, teklif vermek 5 kredi harcar.`;

const CATEGORIES = [
  {
    name: 'Boya & Badana',
    priceRange: { min: 500, max: 5000 },
    unit: 'oda/m²',
  },
  { name: 'Tesisat', priceRange: { min: 150, max: 2000 }, unit: 'iş' },
  { name: 'Elektrik', priceRange: { min: 200, max: 3000 }, unit: 'iş' },
  { name: 'Temizlik', priceRange: { min: 300, max: 1500 }, unit: 'seans' },
  { name: 'Nakliyat', priceRange: { min: 500, max: 5000 }, unit: 'taşıma' },
  { name: 'Mobilya Montaj', priceRange: { min: 150, max: 800 }, unit: 'parça' },
  { name: 'Tadilat', priceRange: { min: 1000, max: 20000 }, unit: 'proje' },
  { name: 'Bahçe', priceRange: { min: 200, max: 2000 }, unit: 'seans' },
  { name: 'Özel Ders', priceRange: { min: 100, max: 500 }, unit: 'saat' },
  { name: 'Güvenlik', priceRange: { min: 300, max: 3000 }, unit: 'iş' },
];

const FAQ: Record<string, string> = {
  token:
    'Platform üzerinde teklif vermek için kredi kullanılır. Her yeni hesap 100 kredi ile başlar. Bir teklif vermek 5 kredi harcar.',
  ödeme:
    'Ödeme doğrudan müşteri ile usta arasında yapılır. Platform şu an ödeme aracılığı yapmamaktadır.',
  ilan: 'İlan vermek ücretsizdir. Ustalar ilanınızı görür ve teklif verebilir. En fazla 20 fotoğraf ekleyebilirsiniz.',
  şikayet:
    'Sorun yaşarsanız değerlendirme bırakabilirsiniz. Ciddi sorunlar için support@yapgitsin.tr adresine yazabilirsiniz.',
  'öne çıkarma':
    'İlanınızı veya profilinizi ücretli olarak öne çıkarabilirsiniz. Detaylar için ayarlar > premium bölümüne bakın.',
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly gemini: GeminiClient) {}

  // ─── Existing endpoints ───────────────────────────────────────────────────

  async generateJobDescription(
    title: string,
    category: string,
    location?: string,
  ): Promise<string> {
    try {
      return await this.gemini.generate({
        systemText: SYSTEM_PROMPT,
        userText: `Write a clear, professional job description for the following service listing.
Respond in Turkish.
Title: ${title}
Category: ${category}${location ? `\nLocation: ${location}` : ''}

Include: what the job entails, what skills/experience to look for, and what the customer expects. Keep it under 150 words. Return only the description text, no preamble.`,
        maxOutputTokens: 1024,
      });
    } catch (err) {
      this.logger.error(
        `generateJobDescription failed: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Failed to generate job description',
      );
    }
  }

  /**
   * Public chat endpoint — Gemini 2.5 Flash. Multi-turn history capped at 8 turns.
   */
  async chat(
    message: string,
    history: GeminiHistoryTurn[] = [],
  ): Promise<string> {
    try {
      return await this.gemini.generate({
        systemText: GEMINI_SYSTEM_PROMPT,
        userText: message ?? '',
        history,
        temperature: 0.7,
      });
    } catch (err) {
      this.logger.error(
        `chat failed: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new InternalServerErrorException('AI chat request failed');
    }
  }

  async summarizeReviews(reviews: string[]): Promise<string> {
    if (reviews.length === 0) return 'No reviews to summarize.';

    try {
      const reviewList = reviews.map((r, i) => `${i + 1}. "${r}"`).join('\n');
      return await this.gemini.generate({
        systemText: SYSTEM_PROMPT,
        userText: `Summarize these customer reviews for a service provider in 2-3 sentences. Highlight strengths and any common concerns:\n\n${reviewList}`,
        maxOutputTokens: 512,
        temperature: 0.5,
      });
    } catch (err) {
      this.logger.error(
        `summarizeReviews failed: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new InternalServerErrorException('Failed to summarize reviews');
    }
  }

  // ─── SEO: Category description generator ──────────────────────────────────

  async generateCategoryDescription(
    category: string,
    city?: string,
    length: 'short' | 'medium' | 'long' = 'medium',
  ): Promise<{
    description: string;
    headings: string[];
    faqs: { q: string; a: string }[];
  }> {
    const wordTarget = length === 'short' ? 150 : length === 'long' ? 400 : 250;
    const localTouch = city
      ? `Şehir bağlamı: ${city}. İçerikte ${city}'da bu hizmet için yerel ipuçları ver (semt çeşitliliği, ortalama fiyat aralığı, ulaşım/erişim notu).`
      : 'Türkiye genelinde geçerli pratik bilgiler ver.';

    const userPrompt = `Türkiye'nin önde gelen hizmet marketplace platformu Yapgitsin için "${category}" kategorisi SEO içeriği üret.

${localTouch}

Çıktı SADECE geçerli JSON olsun, markdown fence yok, ek metin yok:
{
  "description": "<doğal akıcı Türkçe ${wordTarget} kelime civarı tanıtım metni; kategoriye özel pratik bilgiler, ortalama fiyat aralığı (TRY), dikkat edilecek noktalar; reklam dili değil bilgilendirici ton>",
  "headings": ["<2-3 H2 başlık önerisi>"],
  "faqs": [
    { "q": "<sıkça sorulan kısa soru>", "a": "<2-3 cümlelik net cevap>" }
  ]
}

faqs uzunluğu 3-5 arası olsun. SSS uzun-kuyruk SEO odaklı: fiyat, süre, garanti, malzeme, randevu gibi konular.`;

    try {
      const raw = await this.gemini.generate({
        systemText:
          SYSTEM_PROMPT +
          '\n\nSEO içerik modu: Sadece geçerli JSON döndür. Anahtar kelime istifi yapma; doğal akıcı Türkçe yaz.',
        userText: userPrompt,
        maxOutputTokens: 2048,
        temperature: 0.5,
      });
      const parsed = this.gemini.parseJsonLoose(raw);
      return {
        description: (parsed.description as string) ?? '',
        headings: Array.isArray(parsed.headings)
          ? (parsed.headings as string[])
          : [],
        faqs: Array.isArray(parsed.faqs)
          ? (parsed.faqs as { q: string; a: string }[])
          : [],
      };
    } catch (err) {
      this.logger.error(
        `generateCategoryDescription failed: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new InternalServerErrorException('Kategori açıklaması üretilemedi');
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Static category price table as prompt-ready text. */
  private priceReference(): string {
    return CATEGORIES.map(
      (c) =>
        `- ${c.name}: ${c.priceRange.min}-${c.priceRange.max} TRY / ${c.unit}`,
    ).join('\n');
  }

  // ─── Agent 1: İlan Asistanı ───────────────────────────────────────────────

  async runJobAssistant(
    title: string,
    category?: string,
    location?: string,
    budgetHint?: number,
  ): Promise<{
    description: string;
    suggestedBudgetMin: number;
    suggestedBudgetMax: number;
    tips: string;
  }> {
    const systemText =
      SYSTEM_PROMPT +
      '\n\nWhen asked for structured output, respond ONLY with valid JSON — no markdown fences, no extra text.';

    const userPrompt = `Create a complete job listing for a Turkish service marketplace.

Title: ${title}
Category: ${category ?? 'unknown'}
${location ? `Location: ${location}` : ''}
${budgetHint ? `Customer budget hint: ${budgetHint} TRY` : ''}

Reference market price ranges (Turkey base, TRY). Adjust for location: İstanbul/Ankara/İzmir ≈ +15%, premium İstanbul districts (Beşiktaş, Sarıyer, Kadıköy, Şişli, Bakırköy) ≈ +30%:
${this.priceReference()}

If the category is unknown, pick the best match from the list above. Use the matching range (location-adjusted) for the suggested budget.

Return ONLY this JSON (no markdown):
{
  "description": "<professional Turkish job description, max 120 words>",
  "suggestedBudgetMin": <number>,
  "suggestedBudgetMax": <number>,
  "tips": "<1-2 sentence Turkish hiring tip for this category>"
}`;

    try {
      const raw = await this.gemini.generate({
        systemText,
        userText: userPrompt,
        maxOutputTokens: 1024,
        temperature: 0.6,
      });
      const parsed = this.gemini.parseJsonLoose(raw);
      return {
        description: (parsed.description as string) ?? '',
        suggestedBudgetMin: (parsed.suggestedBudgetMin as number) ?? 0,
        suggestedBudgetMax: (parsed.suggestedBudgetMax as number) ?? 0,
        tips: (parsed.tips as string) ?? '',
      };
    } catch (err) {
      this.logger.error(
        `runJobAssistant failed: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new InternalServerErrorException('İlan asistanı başarısız oldu');
    }
  }

  // ─── Agent 2: Fiyat Danışmanı ─────────────────────────────────────────────

  async runPricingAdvisor(
    category: string,
    jobDetails: string,
    location?: string,
  ): Promise<{ budgetMin: number; budgetMax: number; rationale: string }> {
    const userPrompt = `A customer needs pricing advice on a Turkish service marketplace.

Category: ${category}
Job details: ${jobDetails}
${location ? `Location: ${location}` : ''}

Reference market price ranges (Turkey base, TRY). Adjust for location: İstanbul/Ankara/İzmir ≈ +15%, premium İstanbul districts (Beşiktaş, Sarıyer, Kadıköy, Şişli, Bakırköy) ≈ +30%:
${this.priceReference()}

Using the matching range (location-adjusted) and the job details, return ONLY this JSON (no markdown):
{
  "budgetMin": <number in TRY>,
  "budgetMax": <number in TRY>,
  "rationale": "<1-2 sentence Turkish explanation of the suggested price>"
}`;

    try {
      const raw = await this.gemini.generate({
        systemText:
          SYSTEM_PROMPT +
          '\n\nRespond ONLY with valid JSON when asked for structured output.',
        userText: userPrompt,
        maxOutputTokens: 512,
        temperature: 0.4,
      });
      const parsed = this.gemini.parseJsonLoose(raw);
      return {
        budgetMin: (parsed.budgetMin as number) ?? 0,
        budgetMax: (parsed.budgetMax as number) ?? 0,
        rationale: (parsed.rationale as string) ?? '',
      };
    } catch (err) {
      this.logger.error(
        `runPricingAdvisor failed: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new InternalServerErrorException('Fiyat danışmanı başarısız oldu');
    }
  }

  // ─── Agent 3: Destek Ajanı ────────────────────────────────────────────────

  /**
   * Phase 281: native tool-use removed (Gemini Flash REST has function calling,
   * but for static FAQ/platform data inline prompt is simpler and cheaper).
   */
  async runSupportAgent(
    message: string,
    history: GeminiHistoryTurn[] = [],
    userRole?: string,
  ): Promise<string> {
    const faqLines = Object.entries(FAQ)
      .map(([topic, ans]) => `- **${topic}:** ${ans}`)
      .join('\n');

    const platformInfo = `- Kategoriler: ${CATEGORIES.map((c) => c.name).join(', ')}
- Teklif başına maliyet: 5 kredi
- Yeni hesap başlangıç bakiyesi: 100 kredi
- İlan başına max fotoğraf: 20
- Destek e-postası: support@yapgitsin.tr`;

    const systemText = `${SYSTEM_PROMPT}

Kullanıcı rolü: ${userRole ?? 'customer'}. Türkçe yanıt ver. Kısa ve net ol.

Platform bilgisi (cevaplarken bu verileri kullan):
${platformInfo}

SSS konuları:
${faqLines}

Bu listede olmayan konularda "support@yapgitsin.tr adresine yazabilirsiniz" diyebilirsin.`;

    try {
      return await this.gemini.generate({
        systemText,
        userText: message,
        history,
        maxOutputTokens: 1024,
        temperature: 0.5,
      });
    } catch (err) {
      this.logger.error(
        `runSupportAgent failed: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new InternalServerErrorException('Destek ajanı başarısız oldu');
    }
  }
}
