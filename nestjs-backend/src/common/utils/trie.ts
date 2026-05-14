/**
 * Generic Trie + Levenshtein fuzzy utility.
 * Kullanım: import { Trie } from 'src/common/utils/trie'
 *
 * T = her token'a eklenen arbitrary data (örn. kategori objesi, id, vb.)
 */

interface TrieNode<T> {
  children: Map<string, TrieNode<T>>;
  /** Bu prefix'e sahip tüm data kayıtları */
  items: Set<T>;
}

function newNode<T>(): TrieNode<T> {
  return { children: new Map(), items: new Set() };
}

/** Levenshtein distance (iterative, O(m*n) space-optimised) */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

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

export class Trie<T = unknown> {
  private root: TrieNode<T> = newNode<T>();
  /** token → data[] fast lookup for fuzzy fallback */
  private tokenMap = new Map<string, Set<T>>();

  /** word: normalised token, data: associated payload */
  insert(word: string, data: T): void {
    if (!word) return;

    // token map (Levenshtein fallback)
    let bucket = this.tokenMap.get(word);
    if (!bucket) {
      bucket = new Set<T>();
      this.tokenMap.set(word, bucket);
    }
    bucket.add(data);

    // trie insert — every prefix level holds the data
    let node = this.root;
    for (const ch of word) {
      let next = node.children.get(ch);
      if (!next) {
        next = newNode<T>();
        node.children.set(ch, next);
      }
      node = next;
      node.items.add(data);
    }
  }

  /** Exact prefix search — returns up to maxResults items. */
  search(prefix: string, maxResults = 5): T[] {
    if (!prefix) return [];
    let node: TrieNode<T> | undefined = this.root;
    for (const ch of prefix) {
      node = node.children.get(ch);
      if (!node) return [];
    }
    const result: T[] = [];
    for (const item of node.items) {
      if (result.length >= maxResults) break;
      result.push(item);
    }
    return result;
  }

  /**
   * Fuzzy search: prefix match first, then Levenshtein fallback.
   * maxDist: maximum edit distance allowed (1 = typo-tolerant, 2 = lenient)
   */
  fuzzy(query: string, maxDist = 1, maxResults = 5): T[] {
    if (!query) return [];

    // phase 1: exact prefix
    const prefixHits = this.search(query, maxResults);
    if (prefixHits.length >= maxResults) return prefixHits;

    const seen = new Set<T>(prefixHits);

    // phase 2: levenshtein over tokenMap
    const candidates: Array<{ item: T; dist: number }> = [];
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

    // sort by ascending distance, append to prefix hits
    candidates.sort((a, b) => a.dist - b.dist);
    const combined = [...prefixHits];
    for (const { item } of candidates) {
      if (combined.length >= maxResults) break;
      combined.push(item);
    }
    return combined;
  }

  /** Reset all state. */
  clear(): void {
    this.root = newNode<T>();
    this.tokenMap.clear();
  }
}
