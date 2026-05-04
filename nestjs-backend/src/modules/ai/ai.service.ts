import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are a helpful AI assistant for a service marketplace platform called Hizmet.
This platform connects customers with service providers for jobs like home repairs, cleaning, tutoring, and more.
Be concise, practical, and focused on helping users of this marketplace.`;

@Injectable()
export class AiService {
  private readonly client: Anthropic;

  constructor(private readonly configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  async generateJobDescription(
    title: string,
    category: string,
    location?: string,
  ): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 1024,
        thinking: { type: 'adaptive' },
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: `Write a clear, professional job description for the following service listing:
Title: ${title}
Category: ${category}${location ? `\nLocation: ${location}` : ''}

Include: what the job entails, what skills/experience to look for, and what the customer expects. Keep it under 150 words.`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      return textBlock ? (textBlock as Anthropic.TextBlock).text : '';
    } catch {
      throw new InternalServerErrorException('Failed to generate job description');
    }
  }

  async chat(
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  ): Promise<string> {
    try {
      const messages: Anthropic.MessageParam[] = [
        ...history,
        { role: 'user', content: message },
      ];

      const response = await this.client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages,
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      return textBlock ? (textBlock as Anthropic.TextBlock).text : '';
    } catch {
      throw new InternalServerErrorException('AI chat request failed');
    }
  }

  async summarizeReviews(reviews: string[]): Promise<string> {
    if (reviews.length === 0) return 'No reviews to summarize.';

    try {
      const reviewList = reviews
        .map((r, i) => `${i + 1}. "${r}"`)
        .join('\n');

      const response = await this.client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 512,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: `Summarize these customer reviews for a service provider in 2-3 sentences. Highlight strengths and any common concerns:\n\n${reviewList}`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      return textBlock ? (textBlock as Anthropic.TextBlock).text : '';
    } catch {
      throw new InternalServerErrorException('Failed to summarize reviews');
    }
  }
}
