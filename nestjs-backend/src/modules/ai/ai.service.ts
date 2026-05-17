import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are a helpful AI assistant for a service marketplace platform called Hizmet.
This platform connects customers with service providers for jobs like home repairs, cleaning, tutoring, and more.
Be concise, practical, and focused on helping users of this marketplace.`;

// Gemini 2.0 Flash — free tier — used for the public /ai/chat endpoint.
// All other (agent / SEO) endpoints continue to use Anthropic.
const GEMINI_SYSTEM_PROMPT = `Sen Yapgitsin marketplace platformunun yardımcı asistanısın.
Türkçe yanıt ver (kullanıcı İngilizce yazarsa İngilizce yanıt ver). Kısa, net ve pratik ol.
Platform: müşteriler iş ilanı açar, ustalar teklif verir; ödeme platform dışı (escrow opsiyonel),
her hesap 100 jeton ile başlar, teklif vermek 5 jeton harcar.`;

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_MAX_INPUT_CHARS = 8000; // ~2k tokens
const GEMINI_MAX_OUTPUT_TOKENS = 1024;

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
    'Platform üzerinde teklif vermek için token kullanılır. Her yeni hesap 100 token ile başlar. Bir teklif vermek 5 token harcar.',
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
  private readonly client: Anthropic;

  constructor(private readonly configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  // ─── Existing endpoints ───────────────────────────────────────────────────

  async generateJobDescription(
    title: string,
    category: string,
    location?: string,
  ): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 1024,
        thinking: { type: 'adaptive' },
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: `Write a clear, professional job description for the following service listing:
Title: ${title}
Category: ${category}${location ? `\nLocation: ${location}` : ''}

Include: what the job entails, what skills/experience to look for, and what the customer expects. Keep it under 150 words.`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      return textBlock ? textBlock.text : '';
    } catch {
      throw new InternalServerErrorException(
        'Failed to generate job description',
      );
    }
  }

  /**
   * Public chat endpoint — uses Google Gemini 2.0 Flash (free tier).
   * Input capped at ~2k tokens, output at 1k tokens.
   * Requires env: GEMINI_API_KEY (set in Plesk).
   */
  async chat(
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  ): Promise<string> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('GEMINI_API_KEY not configured');
    }

    const trimmedMessage = (message ?? '').slice(0, GEMINI_MAX_INPUT_CHARS);
    // Cap history tail so total input stays bounded.
    const trimmedHistory = (history ?? [])
      .slice(-8)
      .map((h) => ({
        role: h.role,
        content: (h.content ?? '').slice(0, 2000),
      }));

    const contents = [
      ...trimmedHistory.map((h) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })),
      { role: 'user', parts: [{ text: trimmedMessage }] },
    ];

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}` +
      `:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: GEMINI_SYSTEM_PROMPT }],
          },
          contents,
          generationConfig: {
            maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
            temperature: 0.7,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Gemini HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      return parts.map((p) => p.text ?? '').join('').trim();
    } catch {
      throw new InternalServerErrorException('AI chat request failed');
    }
  }

  async summarizeReviews(reviews: string[]): Promise<string> {
    if (reviews.length === 0) return 'No reviews to summarize.';

    try {
      const reviewList = reviews.map((r, i) => `${i + 1}. "${r}"`).join('\n');

      const response = await this.client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 512,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: `Summarize these customer reviews for a service provider in 2-3 sentences. Highlight strengths and any common concerns:\n\n${reviewList}`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      return textBlock ? textBlock.text : '';
    } catch {
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
    const wordTarget =
      length === 'short' ? 150 : length === 'long' ? 400 : 250;
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
      const response = await this.client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 2048,
        system: [
          {
            type: 'text',
            text:
              SYSTEM_PROMPT +
              '\n\nSEO içerik modu: Sadece geçerli JSON döndür. Anahtar kelime istifi yapma; doğal akıcı Türkçe yaz.',
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userPrompt }],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      const raw = textBlock ? textBlock.text : '';
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      const parsed = JSON.parse(cleaned) as Record<string, unknown>;
      return {
        description: (parsed.description as string) ?? '',
        headings: Array.isArray(parsed.headings)
          ? (parsed.headings as string[])
          : [],
        faqs: Array.isArray(parsed.faqs)
          ? (parsed.faqs as { q: string; a: string }[])
          : [],
      };
    } catch {
      throw new InternalServerErrorException(
        'Kategori açıklaması üretilemedi',
      );
    }
  }

  // ─── Agent infrastructure ─────────────────────────────────────────────────

  private executeTool(name: string, input: Record<string, unknown>): unknown {
    switch (name) {
      case 'get_categories':
        return CATEGORIES;

      case 'get_price_range': {
        const cat = CATEGORIES.find((c) => c.name === input.category);
        if (!cat) return { error: 'Kategori bulunamadı' };
        const m = this.locationMultiplier(input.location as string | undefined);
        return {
          category: cat.name,
          min: Math.round(cat.priceRange.min * m),
          max: Math.round(cat.priceRange.max * m),
          unit: cat.unit,
          note: 'Piyasa ortalaması — iş kapsamına göre değişir.',
        };
      }

      case 'get_faq': {
        const topic = input.topic as string;
        return {
          answer:
            FAQ[topic] ??
            'Bu konuda bilgi bulunamadı. support@yapgitsin.tr adresine yazabilirsiniz.',
        };
      }

      case 'get_platform_info':
        return {
          categories: CATEGORIES.map((c) => c.name),
          tokenCostPerOffer: 5,
          startingTokens: 100,
          maxPhotosPerJob: 20,
          supportEmail: 'support@yapgitsin.tr',
        };

      default:
        return { error: `Bilinmeyen araç: ${name}` };
    }
  }

  private locationMultiplier(location?: string): number {
    if (!location) return 1.0;
    const l = location.toLowerCase();
    if (
      ['beşiktaş', 'sarıyer', 'kadıköy', 'şişli', 'bakırköy'].some((d) =>
        l.includes(d),
      )
    )
      return 1.3;
    if (['istanbul', 'ankara', 'izmir'].some((c) => l.includes(c))) return 1.15;
    return 1.0;
  }

  private async runAgentLoop(
    messages: Anthropic.MessageParam[],
    tools: Anthropic.Tool[],
    systemText: string,
    maxTokens = 2048,
  ): Promise<string> {
    const msgs = [...messages];

    for (let i = 0; i < 6; i++) {
      const response = await this.client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: maxTokens,
        tools,
        tool_choice: { type: 'auto' },
        system: [
          {
            type: 'text',
            text: systemText,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: msgs,
      });

      const hasToolUse = response.content.some((b) => b.type === 'tool_use');

      if (!hasToolUse) {
        const textBlock = response.content.find((b) => b.type === 'text');
        return textBlock ? textBlock.text : '';
      }

      msgs.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = response.content
        .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
        .map((block) => ({
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: JSON.stringify(
            this.executeTool(
              block.name,
              block.input as Record<string, unknown>,
            ),
          ),
        }));

      msgs.push({ role: 'user', content: toolResults });
    }

    throw new InternalServerErrorException('Agent döngüsü tamamlanamadı');
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
    const tools: Anthropic.Tool[] = [
      {
        name: 'get_categories',
        description:
          'Lists all available service categories with typical price ranges',
        input_schema: { type: 'object' as const, properties: {}, required: [] },
      },
      {
        name: 'get_price_range',
        description:
          'Returns market price range for a category, optionally adjusted for location',
        input_schema: {
          type: 'object' as const,
          properties: {
            category: { type: 'string', description: 'Exact category name' },
            location: {
              type: 'string',
              description: 'City or district name in Turkey',
            },
          },
          required: ['category'],
        },
      },
    ];

    const systemText =
      SYSTEM_PROMPT +
      '\n\nWhen asked for structured output, respond ONLY with valid JSON — no markdown fences, no extra text.';

    const userPrompt = `Create a complete job listing for a Turkish service marketplace.

Title: ${title}
Category: ${category ?? 'unknown'}
${location ? `Location: ${location}` : ''}
${budgetHint ? `Customer budget hint: ${budgetHint} TRY` : ''}

Steps:
1. If category is unknown, call get_categories and pick the best match.
2. Call get_price_range for the chosen category${location ? ' and location' : ''}.
3. Return ONLY this JSON:
{
  "description": "<professional Turkish job description, max 120 words>",
  "suggestedBudgetMin": <number>,
  "suggestedBudgetMax": <number>,
  "tips": "<1-2 sentence Turkish hiring tip for this category>"
}`;

    try {
      const raw = await this.runAgentLoop(
        [{ role: 'user', content: userPrompt }],
        tools,
        systemText,
      );
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return {
        description: (parsed.description as string) ?? '',
        suggestedBudgetMin: (parsed.suggestedBudgetMin as number) ?? 0,
        suggestedBudgetMax: (parsed.suggestedBudgetMax as number) ?? 0,
        tips: (parsed.tips as string) ?? '',
      };
    } catch {
      throw new InternalServerErrorException('İlan asistanı başarısız oldu');
    }
  }

  // ─── Agent 2: Fiyat Danışmanı ─────────────────────────────────────────────

  async runPricingAdvisor(
    category: string,
    jobDetails: string,
    location?: string,
  ): Promise<{ budgetMin: number; budgetMax: number; rationale: string }> {
    const tools: Anthropic.Tool[] = [
      {
        name: 'get_price_range',
        description:
          'Returns market price range for a category and optional location',
        input_schema: {
          type: 'object' as const,
          properties: {
            category: { type: 'string' },
            location: { type: 'string' },
          },
          required: ['category'],
        },
      },
    ];

    const userPrompt = `A customer needs pricing advice on a Turkish service marketplace.

Category: ${category}
Job details: ${jobDetails}
${location ? `Location: ${location}` : ''}

Call get_price_range, then return ONLY this JSON:
{
  "budgetMin": <number in TRY>,
  "budgetMax": <number in TRY>,
  "rationale": "<1-2 sentence Turkish explanation of the suggested price>"
}`;

    try {
      const raw = await this.runAgentLoop(
        [{ role: 'user', content: userPrompt }],
        tools,
        SYSTEM_PROMPT +
          '\n\nRespond ONLY with valid JSON when asked for structured output.',
      );
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return {
        budgetMin: (parsed.budgetMin as number) ?? 0,
        budgetMax: (parsed.budgetMax as number) ?? 0,
        rationale: (parsed.rationale as string) ?? '',
      };
    } catch {
      throw new InternalServerErrorException('Fiyat danışmanı başarısız oldu');
    }
  }

  // ─── Agent 3: Destek Ajanı ────────────────────────────────────────────────

  async runSupportAgent(
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    userRole?: string,
  ): Promise<string> {
    const tools: Anthropic.Tool[] = [
      {
        name: 'get_faq',
        description: 'Returns a FAQ answer for the given topic',
        input_schema: {
          type: 'object' as const,
          properties: {
            topic: {
              type: 'string',
              enum: ['token', 'ödeme', 'ilan', 'şikayet', 'öne çıkarma'],
            },
          },
          required: ['topic'],
        },
      },
      {
        name: 'get_platform_info',
        description: 'Returns general platform statistics and settings',
        input_schema: { type: 'object' as const, properties: {}, required: [] },
      },
    ];

    const systemText =
      SYSTEM_PROMPT +
      `\n\nUser role: ${userRole ?? 'customer'}. Answer in Turkish. Use tools to fetch accurate platform data before answering.`;

    try {
      return await this.runAgentLoop(
        [
          ...history,
          { role: 'user', content: message },
        ] as Anthropic.MessageParam[],
        tools,
        systemText,
        1024,
      );
    } catch {
      throw new InternalServerErrorException('Destek ajanı başarısız oldu');
    }
  }
}
