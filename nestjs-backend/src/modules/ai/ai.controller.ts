import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AiService } from './ai.service';
import { AuthenticatedRequest } from '../../common/types/auth.types';
import {
  AiChatDto,
  GenerateJobDescriptionDto,
  JobAssistantDto,
  PricingAdvisorDto,
  SummarizeReviewsDto,
  SupportAgentDto,
} from './dto/ai.dto';

@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // ─── Existing endpoints ───────────────────────────────────────────────────

  @Post('generate-job-description')
  async generateJobDescription(@Body() dto: GenerateJobDescriptionDto) {
    const description = await this.aiService.generateJobDescription(
      dto.title,
      dto.category,
      dto.location,
    );
    return { description };
  }

  @Post('chat')
  async chat(@Body() dto: AiChatDto) {
    const reply = await this.aiService.chat(dto.message, dto.history);
    return { reply };
  }

  @Post('summarize-reviews')
  async summarizeReviews(@Body() dto: SummarizeReviewsDto) {
    const summary = await this.aiService.summarizeReviews(dto.reviews);
    return { summary };
  }

  // ─── Agent endpoints ──────────────────────────────────────────────────────

  /** İlan Asistanı: generates description + suggests budget using tool calls */
  @Post('job-assistant')
  async jobAssistant(@Body() dto: JobAssistantDto) {
    return this.aiService.runJobAssistant(
      dto.title,
      dto.category,
      dto.location,
      dto.budgetHint,
    );
  }

  /** Fiyat Danışmanı: suggests budget range for a job category */
  @Post('pricing-advisor')
  async pricingAdvisor(@Body() dto: PricingAdvisorDto) {
    return this.aiService.runPricingAdvisor(
      dto.category,
      dto.jobDetails,
      dto.location,
    );
  }

  /** Destek Ajanı: customer/worker support chat with platform knowledge */
  @Post('support-agent')
  async supportAgent(
    @Body() dto: SupportAgentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userRole = req.user?.role ?? 'customer';
    return {
      reply: await this.aiService.runSupportAgent(
        dto.message,
        dto.history,
        userRole,
      ),
    };
  }
}
