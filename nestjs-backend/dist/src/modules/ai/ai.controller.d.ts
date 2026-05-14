import { AiService } from './ai.service';
import { PricingService } from './pricing.service';
import { RecommendationService } from './recommendation.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
import { AiChatDto, GenerateCategoryDescriptionDto, GenerateJobDescriptionDto, JobAssistantDto, PriceSuggestDto, PricingAdvisorDto, SummarizeReviewsDto, SupportAgentDto } from './dto/ai.dto';
export declare class AiPublicController {
    private readonly aiService;
    private readonly pricingService;
    constructor(aiService: AiService, pricingService: PricingService);
    generateCategoryDescription(dto: GenerateCategoryDescriptionDto): Promise<{
        description: string;
        headings: string[];
        faqs: {
            q: string;
            a: string;
        }[];
    }>;
    priceSuggest(dto: PriceSuggestDto): Promise<import("./pricing.service").PriceSuggestion>;
}
export declare class AiController {
    private readonly aiService;
    private readonly recommendationService;
    constructor(aiService: AiService, recommendationService: RecommendationService);
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
    recommendWorkers(jobId: string): Promise<{
        workers: {
            id: string;
            fullName: string;
            averageRating: number;
            totalReviews: number;
            asWorkerSuccess: number;
            workerCategories: string[] | null;
            workerBio: string | null;
            profileImageUrl: string;
            city: string;
        }[];
    }>;
    recommendJobs(workerId: string): Promise<{
        jobs: {
            id: string;
            title: string;
            category: string;
            location: string;
            budgetMinMinor: number | null;
            budgetMaxMinor: number | null;
            status: import("../jobs/job.entity").JobStatus;
            createdAt: Date;
        }[];
    }>;
    assistant(body: {
        message: string;
        context?: string;
    }): Promise<{
        text: string;
    }>;
}
