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
var SemanticSearchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticSearchService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const crypto_1 = require("crypto");
const CACHE_TTL_MS = 5 * 60 * 1000;
let SemanticSearchService = SemanticSearchService_1 = class SemanticSearchService {
    configService;
    logger = new common_1.Logger(SemanticSearchService_1.name);
    client;
    cache = new Map();
    constructor(configService) {
        this.configService = configService;
        const apiKey = this.configService.get('ANTHROPIC_API_KEY');
        this.client = apiKey ? new sdk_1.default({ apiKey }) : null;
    }
    isEnabled() {
        return this.client !== null;
    }
    cacheKey(query, ids) {
        const h = (0, crypto_1.createHash)('sha256');
        h.update(query.trim().toLowerCase());
        h.update('|');
        h.update(ids.slice().sort().join(','));
        return h.digest('hex');
    }
    async rerankWorkers(query, workers) {
        if (!this.client || !query?.trim() || workers.length === 0)
            return workers;
        const ids = workers.map((w) => w.id);
        const key = this.cacheKey(query, ids);
        const now = Date.now();
        const cached = this.cache.get(key);
        if (cached && cached.expiresAt > now) {
            const map = new Map(workers.map((w) => [w.id, w]));
            const reordered = cached.ids
                .map((id) => map.get(id))
                .filter((w) => !!w);
            const seen = new Set(cached.ids);
            for (const w of workers)
                if (!seen.has(w.id))
                    reordered.push(w);
            return reordered;
        }
        const compact = workers.map((w) => ({
            id: w.id,
            name: w.fullName ?? '',
            cats: Array.isArray(w.workerCategories) ? w.workerCategories : [],
            bio: (w.workerBio ?? '').slice(0, 200),
            city: w.city ?? '',
            rating: w.averageRating ?? 0,
            rate: [w.hourlyRateMin, w.hourlyRateMax],
        }));
        const userPrompt = `Müşteri arama sorgusu: "${query}"

Aşağıda usta listesi var. Sorguya en uygun ustaları ÖNCE gelecek şekilde id sırasını yeniden düzenle.
SADECE geçerli JSON dizisi döndür: ["id1","id2",...]. Markdown/açıklama yok.

Ustalar:
${JSON.stringify(compact)}`;
        try {
            const resp = await this.client.messages.create({
                model: 'claude-opus-4-7',
                max_tokens: Math.min(2048, 64 + ids.length * 50),
                system: [
                    {
                        type: 'text',
                        text: 'Sen bir hizmet marketplace arama yeniden sıralayıcısısın. Sadece JSON id dizisi döner.',
                        cache_control: { type: 'ephemeral' },
                    },
                ],
                messages: [{ role: 'user', content: userPrompt }],
            });
            const textBlock = resp.content.find((b) => b.type === 'text');
            const raw = textBlock ? textBlock.text : '';
            const cleaned = raw
                .replace(/^```(?:json)?\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim();
            const parsed = JSON.parse(cleaned);
            if (!Array.isArray(parsed))
                return workers;
            const orderedIds = parsed.filter((x) => typeof x === 'string');
            this.cache.set(key, { ids: orderedIds, expiresAt: now + CACHE_TTL_MS });
            if (this.cache.size > 500) {
                for (const [k, v] of this.cache) {
                    if (v.expiresAt <= now)
                        this.cache.delete(k);
                }
            }
            const map = new Map(workers.map((w) => [w.id, w]));
            const reordered = orderedIds
                .map((id) => map.get(id))
                .filter((w) => !!w);
            const seen = new Set(orderedIds);
            for (const w of workers)
                if (!seen.has(w.id))
                    reordered.push(w);
            return reordered;
        }
        catch (err) {
            this.logger.warn(`rerankWorkers failed: ${err.message}`);
            return workers;
        }
    }
};
exports.SemanticSearchService = SemanticSearchService;
exports.SemanticSearchService = SemanticSearchService = SemanticSearchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SemanticSearchService);
//# sourceMappingURL=semantic-search.service.js.map