import { ConfigService } from '@nestjs/config';
export declare class AiService {
    private readonly configService;
    private readonly client;
    constructor(configService: ConfigService);
    generateJobDescription(title: string, category: string, location?: string): Promise<string>;
    chat(message: string, history?: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>): Promise<string>;
    summarizeReviews(reviews: string[]): Promise<string>;
    private executeTool;
    private locationMultiplier;
    private runAgentLoop;
    runJobAssistant(title: string, category?: string, location?: string, budgetHint?: number): Promise<{
        description: string;
        suggestedBudgetMin: number;
        suggestedBudgetMax: number;
        tips: string;
    }>;
    runPricingAdvisor(category: string, jobDetails: string, location?: string): Promise<{
        budgetMin: number;
        budgetMax: number;
        rationale: string;
    }>;
    runSupportAgent(message: string, history?: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>, userRole?: string): Promise<string>;
}
