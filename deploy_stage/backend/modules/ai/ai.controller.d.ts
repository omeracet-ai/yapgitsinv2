import { AiService } from './ai.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
import { AiChatDto, GenerateJobDescriptionDto, JobAssistantDto, PricingAdvisorDto, SummarizeReviewsDto, SupportAgentDto } from './dto/ai.dto';
export declare class AiController {
    private readonly aiService;
    constructor(aiService: AiService);
    generateJobDescription(dto: GenerateJobDescriptionDto): Promise<{
        description: string;
    }>;
    chat(dto: AiChatDto): Promise<{
        reply: string;
    }>;
    summarizeReviews(dto: SummarizeReviewsDto): Promise<{
        summary: string;
    }>;
    jobAssistant(dto: JobAssistantDto): Promise<{
        description: string;
        suggestedBudgetMin: number;
        suggestedBudgetMax: number;
        tips: string;
    }>;
    pricingAdvisor(dto: PricingAdvisorDto): Promise<{
        budgetMin: number;
        budgetMax: number;
        rationale: string;
    }>;
    supportAgent(dto: SupportAgentDto, req: AuthenticatedRequest): Promise<{
        reply: string;
    }>;
}
