import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { PricingService } from './pricing.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
import {
  AiChatDto,
  GenerateCategoryDescriptionDto,
  GenerateJobDescriptionDto,
  JobAssistantDto,
  PriceSuggestDto,
  PricingAdvisorDto,
  SummarizeReviewsDto,
  SupportAgentDto,
} from './dto/ai.dto';

// Public sibling controller — no JWT guard, used by web build script for SEO.
@Controller('ai')
export class AiPublicController {
  constructor(
    private readonly aiService: AiService,
    private readonly pricingService: PricingService,
  ) {}

  @Post('generate-category-description')
  async generateCategoryDescription(
    @Body() dto: GenerateCategoryDescriptionDto,
  ) {
    return this.aiService.generateCategoryDescription(
      dto.category,
      dto.city,
      dto.length,
    );
  }

  /** Phase 140: AI smart pricing — public, throttled 20/hour per IP. */
  @Post('price-suggest')
  @Throttle({ default: { limit: 20, ttl: 3_600_000 } })
  async priceSuggest(@Body() dto: PriceSuggestDto) {
    return this.pricingService.suggestPrice({
      category: dto.category,
      location: dto.location,
      description: dto.description,
      photos: dto.photos,
      customerType: dto.customerType,
    });
  }
}

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
