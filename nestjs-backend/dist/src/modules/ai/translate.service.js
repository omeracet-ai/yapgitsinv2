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
exports.TranslateService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const LANG_LABELS = {
    tr: 'Turkish',
    en: 'English',
    az: 'Azerbaijani',
};
let TranslateService = class TranslateService {
    configService;
    client;
    constructor(configService) {
        this.configService = configService;
        const key = this.configService.get('ANTHROPIC_API_KEY');
        this.client = key ? new sdk_1.default({ apiKey: key }) : null;
    }
    isAvailable() {
        return this.client !== null;
    }
    async translate(text, targetLang) {
        if (!this.client) {
            throw new common_1.ServiceUnavailableException('AI çeviri servisi şu anda kullanılamıyor (ANTHROPIC_API_KEY eksik).');
        }
        const trimmed = (text ?? '').trim();
        if (!trimmed)
            return '';
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
        }
        catch {
            throw new common_1.InternalServerErrorException('Çeviri başarısız oldu');
        }
    }
};
exports.TranslateService = TranslateService;
exports.TranslateService = TranslateService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TranslateService);
//# sourceMappingURL=translate.service.js.map