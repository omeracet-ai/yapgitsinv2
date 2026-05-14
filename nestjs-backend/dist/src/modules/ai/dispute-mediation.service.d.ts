import { ConfigService } from '@nestjs/config';
export type SuggestedAction = 'refund' | 'partial_refund' | 'cancel' | 'dismiss' | 'escalate';
export interface DisputeAnalysis {
    fairnessScore: number;
    fraudRisk: 'low' | 'medium' | 'high';
    suggestedAction: SuggestedAction;
    reasoning: string;
    analyzedAt: string;
}
export interface AnalyzeDisputeInput {
    type: string;
    description: string;
    againstUserId: string;
    jobId?: string | null;
    bookingId?: string | null;
    contextData?: Record<string, unknown>;
}
export declare class DisputeMediationService {
    private readonly config;
    private readonly logger;
    private readonly client;
    private readonly cache;
    constructor(config: ConfigService);
    private cacheKey;
    analyzeDispute(input: AnalyzeDisputeInput): Promise<DisputeAnalysis | null>;
    private normalizeAction;
}
