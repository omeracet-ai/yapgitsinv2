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
var FraudDetectionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraudDetectionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const FRAUD_SYSTEM = `You are a fraud detection assistant for a Turkish service marketplace (Yapgitsin).
Detect spam, scams, fake listings, suspicious phone/contact extraction, money laundering signals,
adult content, hate speech, or impersonation. Output STRICT JSON only.`;
let FraudDetectionService = FraudDetectionService_1 = class FraudDetectionService {
    config;
    logger = new common_1.Logger(FraudDetectionService_1.name);
    client;
    constructor(config) {
        this.config = config;
        const key = this.config.get('ANTHROPIC_API_KEY');
        this.client = key ? new sdk_1.default({ apiKey: key }) : null;
    }
    async analyzeJobListing(title, description) {
        return this.analyze(`İŞ İLANI:\nBaşlık: ${title}\nAçıklama: ${description}`);
    }
    async analyzeReview(comment) {
        return this.analyze(`KULLANICI YORUMU:\n${comment}`);
    }
    async analyzeBio(bio) {
        return this.analyze(`USTA PROFİL BIO:\n${bio}`);
    }
    async analyze(content) {
        if (!this.client)
            return { score: 0, reasons: [] };
        try {
            const response = await this.client.messages.create({
                model: 'claude-opus-4-7',
                max_tokens: 512,
                system: [
                    {
                        type: 'text',
                        text: FRAUD_SYSTEM +
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
            const parsed = JSON.parse(cleaned);
            const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
            const reasons = Array.isArray(parsed.reasons)
                ? parsed.reasons.filter((r) => typeof r === 'string').slice(0, 8)
                : [];
            return { score, reasons };
        }
        catch (e) {
            this.logger.warn(`Fraud analyze failed: ${e.message}`);
            return { score: 0, reasons: [] };
        }
    }
};
exports.FraudDetectionService = FraudDetectionService;
exports.FraudDetectionService = FraudDetectionService = FraudDetectionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FraudDetectionService);
//# sourceMappingURL=fraud-detection.service.js.map