import { ConfigService } from '@nestjs/config';
export interface PriceSuggestion {
    minPrice: number;
    maxPrice: number;
    medianPrice: number;
    confidence: 'low' | 'medium' | 'high';
    reasoning: string;
    currency: 'TRY';
}
export declare class PricingService {
    private readonly configService;
    private readonly logger;
    private readonly client;
    private readonly cache;
    constructor(configService: ConfigService);
    private hashKey;
    private getFromCache;
    private setCache;
    suggestPrice(input: {
        category: string;
        location?: string;
        description: string;
        photos?: string[];
        customerType?: string;
    }): Promise<PriceSuggestion>;
}
