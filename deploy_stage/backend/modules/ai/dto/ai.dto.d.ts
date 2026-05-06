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
export declare class JobAssistantDto {
    title: string;
    category?: string;
    location?: string;
    budgetHint?: number;
}
export declare class PricingAdvisorDto {
    category: string;
    jobDetails: string;
    location?: string;
}
export declare class SupportAgentDto {
    message: string;
    history?: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
}
