export interface FilterResult {
    flagged: boolean;
    reasons: string[];
}
export declare class ContentFilterService {
    private readonly badWords;
    private readonly contactPatterns;
    check(text: string): FilterResult;
    sanitize(text: string): string;
}
