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
var DisputeMediationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputeMediationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const crypto_1 = require("crypto");
const SYSTEM = `Sen bir Türk hizmet pazarı (Yapgitsin) için anlaşmazlık ön-analiz asistanısın.
Şikayetin taraflara adil olup olmadığını, sahte iddia (fraud) riskini ve önerilen çözümü değerlendir.
SADECE STRICT JSON döndür. Türkçe reasoning yaz.`;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
let DisputeMediationService = DisputeMediationService_1 = class DisputeMediationService {
    config;
    logger = new common_1.Logger(DisputeMediationService_1.name);
    client;
    cache = new Map();
    constructor(config) {
        this.config = config;
        const key = this.config.get('ANTHROPIC_API_KEY');
        this.client = key ? new sdk_1.default({ apiKey: key }) : null;
    }
    cacheKey(type, description) {
        return (0, crypto_1.createHash)('sha256').update(`${type}::${description}`).digest('hex');
    }
    async analyzeDispute(input) {
        if (!this.client)
            return null;
        const key = this.cacheKey(input.type, input.description);
        const now = Date.now();
        const hit = this.cache.get(key);
        if (hit && hit.expiresAt > now)
            return hit.result;
        try {
            const ctx = input.contextData
                ? `\nEK BAĞLAM: ${JSON.stringify(input.contextData)}`
                : '';
            const ref = input.jobId
                ? `\nİŞ İD: ${input.jobId}`
                : input.bookingId
                    ? `\nRANDEVU İD: ${input.bookingId}`
                    : '';
            const response = await this.client.messages.create({
                model: 'claude-opus-4-7',
                max_tokens: 700,
                system: [
                    {
                        type: 'text',
                        text: SYSTEM +
                            '\n\nFormat: {"fairnessScore": <0-100>, "fraudRisk": "low|medium|high", "suggestedAction": "refund|partial_refund|cancel|dismiss|escalate", "reasoning": "<kısa türkçe>"}',
                        cache_control: { type: 'ephemeral' },
                    },
                ],
                messages: [
                    {
                        role: 'user',
                        content: `ŞİKAYET TÜRÜ: ${input.type}\nAÇIKLAMA: ${input.description}${ref}${ctx}\n\nBu anlaşmazlık için fairness (0=karşı tarafa adil, 100=şikayetçi haklı), fraud risk ve önerilen çözüm. JSON dön.`,
                    },
                ],
            });
            const block = response.content.find((b) => b.type === 'text');
            const raw = block ? block.text : '';
            const cleaned = raw
                .replace(/^```(?:json)?\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim();
            const parsed = JSON.parse(cleaned);
            const result = {
                fairnessScore: Math.max(0, Math.min(100, Number(parsed.fairnessScore) || 50)),
                fraudRisk: parsed.fraudRisk === 'high' || parsed.fraudRisk === 'medium'
                    ? parsed.fraudRisk
                    : 'low',
                suggestedAction: this.normalizeAction(parsed.suggestedAction),
                reasoning: typeof parsed.reasoning === 'string'
                    ? parsed.reasoning.slice(0, 800)
                    : '',
                analyzedAt: new Date().toISOString(),
            };
            this.cache.set(key, { result, expiresAt: now + CACHE_TTL_MS });
            if (this.cache.size > 500) {
                for (const [k, v] of this.cache) {
                    if (v.expiresAt <= now)
                        this.cache.delete(k);
                }
            }
            return result;
        }
        catch (e) {
            this.logger.warn(`Dispute analyze failed: ${e.message}`);
            return null;
        }
    }
    normalizeAction(v) {
        const allowed = [
            'refund',
            'partial_refund',
            'cancel',
            'dismiss',
            'escalate',
        ];
        return allowed.includes(v)
            ? v
            : 'escalate';
    }
};
exports.DisputeMediationService = DisputeMediationService;
exports.DisputeMediationService = DisputeMediationService = DisputeMediationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DisputeMediationService);
//# sourceMappingURL=dispute-mediation.service.js.map