import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AiService } from './ai.service';
import { AiChatDto, GenerateJobDescriptionDto, SummarizeReviewsDto } from './dto/ai.dto';

@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AiController {
  constructor(private readonly aiService: AiService) {}

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
}
