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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CategorySearchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategorySearchService = void 0;
exports.normalizeTr = normalizeTr;
exports.levenshtein = levenshtein;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const category_entity_1 = require("./category.entity");
const newNode = () => ({
    children: new Map(),
    categoryIds: new Set(),
});
function normalizeTr(input) {
    if (!input)
        return '';
    return input
        .toLowerCase()
        .replace(/ç/g, 'c')
        .replace(/ğ/g, 'g')
        .replace(/ı/g, 'i')
        .replace(/İ/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ş/g, 's')
        .replace(/ü/g, 'u')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function levenshtein(a, b) {
    if (a === b)
        return 0;
    if (!a.length)
        return b.length;
    if (!b.length)
        return a.length;
    const m = a.length;
    const n = b.length;
    let prev = new Array(n + 1);
    let curr = new Array(n + 1);
    for (let j = 0; j <= n; j++)
        prev[j] = j;
    for (let i = 1; i <= m; i++) {
        curr[0] = i;
        const ac = a.charCodeAt(i - 1);
        for (let j = 1; j <= n; j++) {
            const cost = ac === b.charCodeAt(j - 1) ? 0 : 1;
            curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        }
        [prev, curr] = [curr, prev];
    }
    return prev[n];
}
let CategorySearchService = CategorySearchService_1 = class CategorySearchService {
    repo;
    logger = new common_1.Logger(CategorySearchService_1.name);
    root = newNode();
    tokenIndex = new Map();
    categoryById = new Map();
    constructor(repo) {
        this.repo = repo;
    }
    async onModuleInit() {
        await this.rebuild();
    }
    async rebuild() {
        const all = await this.repo.find({ where: { isActive: true } });
        this.root = newNode();
        this.tokenIndex.clear();
        this.categoryById.clear();
        for (const cat of all) {
            this.categoryById.set(cat.id, cat);
            const tokens = [];
            const addTokens = (raw) => {
                const norm = normalizeTr(raw);
                if (!norm)
                    return;
                for (const tok of norm.split(' ')) {
                    if (tok.length < 2)
                        continue;
                    tokens.push(tok);
                    this.insertTrie(tok, cat.id);
                }
            };
            addTokens(cat.name);
            if (Array.isArray(cat.subServices)) {
                for (const sub of cat.subServices)
                    addTokens(sub);
            }
            this.tokenIndex.set(cat.id, tokens);
        }
        this.logger.log(`Trie rebuilt: ${this.categoryById.size} categories, ${this.countNodes(this.root)} nodes`);
    }
    insertTrie(word, categoryId) {
        let node = this.root;
        for (const ch of word) {
            let next = node.children.get(ch);
            if (!next) {
                next = newNode();
                node.children.set(ch, next);
            }
            node = next;
            node.categoryIds.add(categoryId);
        }
    }
    countNodes(node) {
        let n = 1;
        for (const child of node.children.values())
            n += this.countNodes(child);
        return n;
    }
    searchCategories(query, limit = 5) {
        const norm = normalizeTr(query);
        if (!norm)
            return [];
        const queryTokens = norm.split(' ').filter((t) => t.length >= 2);
        if (!queryTokens.length)
            return [];
        const scores = new Map();
        for (const qt of queryTokens) {
            const ids = this.prefixMatch(qt);
            for (const id of ids) {
                scores.set(id, (scores.get(id) ?? 0) + 10);
            }
        }
        if (scores.size < limit) {
            for (const qt of queryTokens) {
                for (const [id, tokens] of this.tokenIndex.entries()) {
                    let best = Infinity;
                    for (const tok of tokens) {
                        const d = levenshtein(qt, tok);
                        if (d < best)
                            best = d;
                        if (best === 0)
                            break;
                    }
                    const threshold = qt.length <= 4 ? 1 : 2;
                    if (best <= threshold && best > 0) {
                        const bonus = (threshold - best + 1) * 3;
                        scores.set(id, (scores.get(id) ?? 0) + bonus);
                    }
                }
            }
        }
        if (!scores.size)
            return [];
        return [...scores.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([id]) => this.categoryById.get(id))
            .filter(Boolean);
    }
    prefixMatch(prefix) {
        let node = this.root;
        for (const ch of prefix) {
            node = node.children.get(ch);
            if (!node)
                return new Set();
        }
        return node.categoryIds;
    }
};
exports.CategorySearchService = CategorySearchService;
exports.CategorySearchService = CategorySearchService = CategorySearchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(category_entity_1.Category)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CategorySearchService);
//# sourceMappingURL=category-search.service.js.map