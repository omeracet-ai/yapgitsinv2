"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const SYSTEM_PROMPT = `You are a helpful AI assistant for a service marketplace platform called Hizmet.
This platform connects customers with service providers for jobs like home repairs, cleaning, tutoring, and more.
Be concise, practical, and focused on helping users of this marketplace.`;
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
const FAQ = {
    token: 'Platform üzerinde teklif vermek için token kullanılır. Her yeni hesap 100 token ile başlar. Bir teklif vermek 5 token harcar.',
    ödeme: 'Ödeme doğrudan müşteri ile usta arasında yapılır. Platform şu an ödeme aracılığı yapmamaktadır.',
    ilan: 'İlan vermek ücretsizdir. Ustalar ilanınızı görür ve teklif verebilir. En fazla 20 fotoğraf ekleyebilirsiniz.',
    şikayet: 'Sorun yaşarsanız değerlendirme bırakabilirsiniz. Ciddi sorunlar için destek@yapgitsin.tr adresine yazabilirsiniz.',
    'öne çıkarma': 'İlanınızı veya profilinizi ücretli olarak öne çıkarabilirsiniz. Detaylar için ayarlar > premium bölümüne bakın.',
};
let AiService = class AiService {
    configService;
    client;
    constructor(configService) {
        this.configService = configService;
        this.client = new sdk_1.default({
            apiKey: this.configService.get('ANTHROPIC_API_KEY'),
        });
    }
    async generateJobDescription(title, category, location) {
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
        }
        catch {
            throw new common_1.InternalServerErrorException('Failed to generate job description');
        }
    }
    async chat(message, history = []) {
        try {
            const messages = [
                ...history,
                { role: 'user', content: message },
            ];
            const response = await this.client.messages.create({
                model: 'claude-opus-4-7',
                max_tokens: 1024,
                system: [
                    {
                        type: 'text',
                        text: SYSTEM_PROMPT,
                        cache_control: { type: 'ephemeral' },
                    },
                ],
                messages,
            });
            const textBlock = response.content.find((b) => b.type === 'text');
            return textBlock ? textBlock.text : '';
        }
        catch {
            throw new common_1.InternalServerErrorException('AI chat request failed');
        }
    }
    async summarizeReviews(reviews) {
        if (reviews.length === 0)
            return 'No reviews to summarize.';
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
        }
        catch {
            throw new common_1.InternalServerErrorException('Failed to summarize reviews');
        }
    }
    async generateCategoryDescription(category, city, length = 'medium') {
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
            const response = await this.client.messages.create({
                model: 'claude-opus-4-7',
                max_tokens: 2048,
                system: [
                    {
                        type: 'text',
                        text: SYSTEM_PROMPT +
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
            const parsed = JSON.parse(cleaned);
            return {
                description: parsed.description ?? '',
                headings: Array.isArray(parsed.headings)
                    ? parsed.headings
                    : [],
                faqs: Array.isArray(parsed.faqs)
                    ? parsed.faqs
                    : [],
            };
        }
        catch {
            throw new common_1.InternalServerErrorException('Kategori açıklaması üretilemedi');
        }
    }
    executeTool(name, input) {
        switch (name) {
            case 'get_categories':
                return CATEGORIES;
            case 'get_price_range': {
                const cat = CATEGORIES.find((c) => c.name === input.category);
                if (!cat)
                    return { error: 'Kategori bulunamadı' };
                const m = this.locationMultiplier(input.location);
                return {
                    category: cat.name,
                    min: Math.round(cat.priceRange.min * m),
                    max: Math.round(cat.priceRange.max * m),
                    unit: cat.unit,
                    note: 'Piyasa ortalaması — iş kapsamına göre değişir.',
                };
            }
            case 'get_faq': {
                const topic = input.topic;
                return {
                    answer: FAQ[topic] ??
                        'Bu konuda bilgi bulunamadı. destek@yapgitsin.tr adresine yazabilirsiniz.',
                };
            }
            case 'get_platform_info':
                return {
                    categories: CATEGORIES.map((c) => c.name),
                    tokenCostPerOffer: 5,
                    startingTokens: 100,
                    maxPhotosPerJob: 20,
                    supportEmail: 'destek@yapgitsin.tr',
                };
            default:
                return { error: `Bilinmeyen araç: ${name}` };
        }
    }
    locationMultiplier(location) {
        if (!location)
            return 1.0;
        const l = location.toLowerCase();
        if (['beşiktaş', 'sarıyer', 'kadıköy', 'şişli', 'bakırköy'].some((d) => l.includes(d)))
            return 1.3;
        if (['istanbul', 'ankara', 'izmir'].some((c) => l.includes(c)))
            return 1.15;
        return 1.0;
    }
    async runAgentLoop(messages, tools, systemText, maxTokens = 2048) {
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
            const toolResults = response.content
                .filter((b) => b.type === 'tool_use')
                .map((block) => ({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(this.executeTool(block.name, block.input)),
            }));
            msgs.push({ role: 'user', content: toolResults });
        }
        throw new common_1.InternalServerErrorException('Agent döngüsü tamamlanamadı');
    }
    async runJobAssistant(title, category, location, budgetHint) {
        const tools = [
            {
                name: 'get_categories',
                description: 'Lists all available service categories with typical price ranges',
                input_schema: { type: 'object', properties: {}, required: [] },
            },
            {
                name: 'get_price_range',
                description: 'Returns market price range for a category, optionally adjusted for location',
                input_schema: {
                    type: 'object',
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
        const systemText = SYSTEM_PROMPT +
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
            const raw = await this.runAgentLoop([{ role: 'user', content: userPrompt }], tools, systemText);
            const parsed = JSON.parse(raw);
            return {
                description: parsed.description ?? '',
                suggestedBudgetMin: parsed.suggestedBudgetMin ?? 0,
                suggestedBudgetMax: parsed.suggestedBudgetMax ?? 0,
                tips: parsed.tips ?? '',
            };
        }
        catch {
            throw new common_1.InternalServerErrorException('İlan asistanı başarısız oldu');
        }
    }
    async runPricingAdvisor(category, jobDetails, location) {
        const tools = [
            {
                name: 'get_price_range',
                description: 'Returns market price range for a category and optional location',
                input_schema: {
                    type: 'object',
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
            const raw = await this.runAgentLoop([{ role: 'user', content: userPrompt }], tools, SYSTEM_PROMPT +
                '\n\nRespond ONLY with valid JSON when asked for structured output.');
            const parsed = JSON.parse(raw);
            return {
                budgetMin: parsed.budgetMin ?? 0,
                budgetMax: parsed.budgetMax ?? 0,
                rationale: parsed.rationale ?? '',
            };
        }
        catch {
            throw new common_1.InternalServerErrorException('Fiyat danışmanı başarısız oldu');
        }
    }
    async runSupportAgent(message, history = [], userRole) {
        const tools = [
            {
                name: 'get_faq',
                description: 'Returns a FAQ answer for the given topic',
                input_schema: {
                    type: 'object',
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
                input_schema: { type: 'object', properties: {}, required: [] },
            },
        ];
        const systemText = SYSTEM_PROMPT +
            `\n\nUser role: ${userRole ?? 'customer'}. Answer in Turkish. Use tools to fetch accurate platform data before answering.`;
        try {
            return await this.runAgentLoop([
                ...history,
                { role: 'user', content: message },
            ], tools, systemText, 1024);
        }
        catch {
            throw new common_1.InternalServerErrorException('Destek ajanı başarısız oldu');
        }
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiService);
//# sourceMappingURL=ai.service.js.map