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
            const reviewList = reviews
                .map((r, i) => `${i + 1}. "${r}"`)
                .join('\n');
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
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiService);
//# sourceMappingURL=ai.service.js.map