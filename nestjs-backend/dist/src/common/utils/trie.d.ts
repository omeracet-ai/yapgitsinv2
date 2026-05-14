export declare function levenshtein(a: string, b: string): number;
export declare class Trie<T = unknown> {
    private root;
    private tokenMap;
    insert(word: string, data: T): void;
    search(prefix: string, maxResults?: number): T[];
    fuzzy(query: string, maxDist?: number, maxResults?: number): T[];
    clear(): void;
}
