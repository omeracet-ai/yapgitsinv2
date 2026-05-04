import { AiService } from './ai.service';
import { AiChatDto, GenerateJobDescriptionDto, SummarizeReviewsDto } from './dto/ai.dto';
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
}
