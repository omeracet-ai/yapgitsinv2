"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var PricingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const crypto = __importStar(require("crypto"));
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
let PricingService = PricingService_1 = class PricingService {
    configService;
    logger = new common_1.Logger(PricingService_1.name);
    client;
    cache = new Map();
    constructor(configService) {
        this.configService = configService;
        const apiKey = this.configService.get('ANTHROPIC_API_KEY');
        this.client = apiKey ? new sdk_1.default({ apiKey }) : null;
    }
    hashKey(input) {
        const norm = `${input.category}|${input.location ?? ''}|${input.description.trim().toLowerCase()}|${input.customerType ?? ''}`;
        return crypto.createHash('sha1').update(norm).digest('hex');
    }
    getFromCache(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (entry.expiresAt < Date.now()) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }
    setCache(key, value) {
        if (this.cache.size >= MAX_CACHE_ENTRIES) {
            const oldest = this.cache.keys().next().value;
            if (oldest)
                this.cache.delete(oldest);
        }
        this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    async suggestPrice(input) {
        if (!this.client) {
            throw new common_1.ServiceUnavailableException('AI fiyat servisi şu anda kullanılamıyor (ANTHROPIC_API_KEY eksik)');
        }
        const key = this.hashKey(input);
        const cached = this.getFromCache(key);
        if (cached)
            return cached;
        const prompt = `Türkiye pazarında ${input.category} kategorisinde, ${input.location ?? 'belirtilmemiş bölge'} bölgesinde, "${input.description}" açıklamalı bir hizmet için adil fiyat aralığı öner.

- 2026 Türkiye fiyatlarını kullan (TRY)
- ${input.category} için tipik saatlik veya proje bazlı fiyatlar
- Şehir bazında düzeltme uygula (İstanbul/Ankara/İzmir +%15-20, Anadolu şehirleri -%10)
- Confidence: açıklama detaylı ve kategori netse "high", makul ipuçları varsa "medium", çok belirsizse "low"
- Reasoning Türkçe, 1-2 cümle, fiyatın neden bu aralıkta olduğunu özetle

YALNIZCA aşağıdaki şemada geçerli JSON dön (markdown veya açıklama metni EKLEME):
{"minPrice": <number>, "maxPrice": <number>, "medianPrice": <number>, "confidence": "low"|"medium"|"high", "reasoning": "<turkish>"}`;
        try {
            const response = await this.client.messages.create({
                model: 'claude-opus-4-7',
                max_tokens: 512,
                system: [
                    {
                        type: 'text',
                        text: 'Sen Türkiye pazarına hakim bir fiyat danışmanısın. SADECE geçerli JSON dönersin.',
                        cache_control: { type: 'ephemeral' },
                    },
                ],
                messages: [{ role: 'user', content: prompt }],
            });
            const textBlock = response.content.find((b) => b.type === 'text');
            const raw = textBlock && textBlock.type === 'text' ? textBlock.text : '';
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('AI yanıtı JSON içermiyor');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            const result = {
                minPrice: Math.max(0, Number(parsed.minPrice) || 0),
                maxPrice: Math.max(0, Number(parsed.maxPrice) || 0),
                medianPrice: Math.max(0, Number(parsed.medianPrice) || 0),
                confidence: parsed.confidence === 'high' || parsed.confidence === 'low'
                    ? parsed.confidence
                    : 'medium',
                reasoning: String(parsed.reasoning ?? '').trim(),
                currency: 'TRY',
            };
            this.setCache(key, result);
            return result;
        }
        catch (err) {
            this.logger.error(`suggestPrice failed: ${err instanceof Error ? err.message : String(err)}`);
            throw new common_1.ServiceUnavailableException('AI fiyat önerisi üretilemedi');
        }
    }
};
exports.PricingService = PricingService;
exports.PricingService = PricingService = PricingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PricingService);
//# sourceMappingURL=pricing.service.js.map