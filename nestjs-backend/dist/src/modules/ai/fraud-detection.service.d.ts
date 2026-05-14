import { ConfigService } from '@nestjs/config';
export interface FraudResult {
    score: number;
    reasons: string[];
}
export declare class FraudDetectionService {
    private readonly config;
    private readonly logger;
    private readonly client;
    constructor(config: ConfigService);
    analyzeJobListing(title: string, description: string): Promise<FraudResult>;
    analyzeReview(comment: string): Promise<FraudResult>;
    analyzeBio(bio: string): Promise<FraudResult>;
    private analyze;
}
