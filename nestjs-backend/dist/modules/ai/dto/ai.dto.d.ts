export declare class GenerateJobDescriptionDto {
    title: string;
    category: string;
    location?: string;
}
export declare class AiChatDto {
    message: string;
    history?: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
}
export declare class SummarizeReviewsDto {
    reviews: string[];
}
