import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';

/**
 * Phase 176 — Trie + Levenshtein fuzzy kategori arama servisi.
 *
 * 29 kategori (in-memory ~20KB), Türkçe karakter normalizasyonu,
 * önce prefix match (trie), yoksa edit-distance ≤2 fallback.
 *
 * Hem `name` hem `subServices` indexlenir.
 */

interface TrieNode {
  children: Map<string, TrieNode>;
  /** Bu nokta bir kelime sonu ise — ait olduğu kategori id'leri */
  categoryIds: Set<string>;
}

const newNode = (): TrieNode => ({
  children: new Map(),
  categoryIds: new Set(),
});

/** Türkçe karakter normalize + lowercase + non-alnum strip */
export function normalizeTr(input: string): string {
  if (!input) return '';
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

/** İki string arasındaki Levenshtein mesafesi — kendi implementasyon (npm dep yok) */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const ac = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ac === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,        // insertion
        prev[j] + 1,            // deletion
        prev[j - 1] + cost,     // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

@Injectable()
export class CategorySearchService implements OnModuleInit {
  private readonly logger = new Logger(CategorySearchService.name);
  private root: TrieNode = newNode();
  /** id → tüm normalize tokenları (Levenshtein fallback için) */
  private tokenIndex = new Map<string, string[]>();
  /** id → Category snapshot (response'da döndürmek için) */
  private categoryById = new Map<string, Category>();

  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rebuild();
  }

  /** Tüm kategorileri yeniden indexle. Kategori CRUD sonrası çağrılır. */
  async rebuild(): Promise<void> {
    const all = await this.repo.find({ where: { isActive: true } });
    this.root = newNode();
    this.tokenIndex.clear();
    this.categoryById.clear();

    for (const cat of all) {
      this.categoryById.set(cat.id, cat);
      const tokens: string[] = [];

      const addTokens = (raw: string) => {
        const norm = normalizeTr(raw);
        if (!norm) return;
        for (const tok of norm.split(' ')) {
          if (tok.length < 2) continue;
          tokens.push(tok);
          this.insertTrie(tok, cat.id);
        }
      };

      addTokens(cat.name);
      if (Array.isArray(cat.subServices)) {
        for (const sub of cat.subServices) addTokens(sub);
      }
      this.tokenIndex.set(cat.id, tokens);
    }
    this.logger.log(
      `Trie rebuilt: ${this.categoryById.size} categories, ${this.countNodes(this.root)} nodes`,
    );
  }

  private insertTrie(word: string, categoryId: string): void {
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

  private countNodes(node: TrieNode): number {
    let n = 1;
    for (const child of node.children.values()) n += this.countNodes(child);
    return n;
  }

  /**
   * Kategori arama:
   *   1) Trie prefix match (her query token için)
   *   2) Yoksa edit-distance ≤2 fallback
   */
  searchCategories(query: string, limit = 5): Category[] {
    const norm = normalizeTr(query);
    if (!norm) return [];

    const queryTokens = norm.split(' ').filter((t) => t.length >= 2);
    if (!queryTokens.length) return [];

    const scores = new Map<string, number>();

    // 1) Trie prefix match
    for (const qt of queryTokens) {
      const ids = this.prefixMatch(qt);
      for (const id of ids) {
        // prefix isabeti yüksek puan
        scores.set(id, (scores.get(id) ?? 0) + 10);
      }
    }

    // 2) Eğer trie hiç bir şey bulamadıysa veya az isabet varsa — Levenshtein
    if (scores.size < limit) {
      for (const qt of queryTokens) {
        for (const [id, tokens] of this.tokenIndex.entries()) {
          let best = Infinity;
          for (const tok of tokens) {
            const d = levenshtein(qt, tok);
            if (d < best) best = d;
            if (best === 0) break;
          }
          // edit distance threshold: token uzunluğuna göre 1-2
          const threshold = qt.length <= 4 ? 1 : 2;
          if (best <= threshold && best > 0) {
            // yakınlık puanı: threshold içinde, mesafe arttıkça düşer
            const bonus = (threshold - best + 1) * 3;
            scores.set(id, (scores.get(id) ?? 0) + bonus);
          }
        }
      }
    }

    if (!scores.size) return [];

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => this.categoryById.get(id)!)
      .filter(Boolean);
  }

  private prefixMatch(prefix: string): Set<string> {
    let node: TrieNode | undefined = this.root;
    for (const ch of prefix) {
      node = node!.children.get(ch);
      if (!node) return new Set();
    }
    return node!.categoryIds;
  }
}
