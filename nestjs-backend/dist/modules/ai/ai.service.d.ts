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
}
