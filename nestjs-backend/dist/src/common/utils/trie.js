"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trie = void 0;
exports.levenshtein = levenshtein;
function newNode() {
    return { children: new Map(), items: new Set() };
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
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    let curr = new Array(n + 1);
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
class Trie {
    root = newNode();
    tokenMap = new Map();
    insert(word, data) {
        if (!word)
            return;
        let bucket = this.tokenMap.get(word);
        if (!bucket) {
            bucket = new Set();
            this.tokenMap.set(word, bucket);
        }
        bucket.add(data);
        let node = this.root;
        for (const ch of word) {
            let next = node.children.get(ch);
            if (!next) {
                next = newNode();
                node.children.set(ch, next);
            }
            node = next;
            node.items.add(data);
        }
    }
    search(prefix, maxResults = 5) {
        if (!prefix)
            return [];
        let node = this.root;
        for (const ch of prefix) {
            node = node.children.get(ch);
            if (!node)
                return [];
        }
        const result = [];
        for (const item of node.items) {
            if (result.length >= maxResults)
                break;
            result.push(item);
        }
        return result;
    }
    fuzzy(query, maxDist = 1, maxResults = 5) {
        if (!query)
            return [];
        const prefixHits = this.search(query, maxResults);
        if (prefixHits.length >= maxResults)
            return prefixHits;
        const seen = new Set(prefixHits);
        const candidates = [];
        for (const [token, items] of this.tokenMap.entries()) {
            const dist = levenshtein(query, token);
            if (dist > 0 && dist <= maxDist) {
                for (const item of items) {
                    if (!seen.has(item)) {
                        candidates.push({ item, dist });
                        seen.add(item);
                    }
                }
            }
        }
        candidates.sort((a, b) => a.dist - b.dist);
        const combined = [...prefixHits];
        for (const { item } of candidates) {
            if (combined.length >= maxResults)
                break;
            combined.push(item);
        }
        return combined;
    }
    clear() {
        this.root = newNode();
        this.tokenMap.clear();
    }
}
exports.Trie = Trie;
//# sourceMappingURL=trie.js.map