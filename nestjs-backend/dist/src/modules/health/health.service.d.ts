import type { Cache } from 'cache-manager';
import { DataSource } from 'typeorm';
export type CheckStatus = 'ok' | 'down' | 'memory-fallback' | 'mock' | 'configured' | 'missing' | 'skipped';
export interface HealthResponse {
    status: 'ok' | 'degraded' | 'down';
    uptime: number;
    version: string;
    buildSha: string;
    checks: {
        database: CheckStatus;
        cache: CheckStatus;
        iyzipay: CheckStatus;
    };
    timestamp: string;
}
export interface DeepHealthResponse extends HealthResponse {
    deep: {
        iyzipay: {
            status: CheckStatus;
            latencyMs: number;
            error?: string;
        };
        smtp: {
            status: CheckStatus;
            error?: string;
        };
        fcm: {
            status: CheckStatus;
            error?: string;
        };
    };
}
export declare class HealthService {
    private readonly dataSource;
    private readonly cache;
    private readonly logger;
    constructor(dataSource: DataSource, cache: Cache);
    private buildSha;
    private checkDatabase;
    private checkCache;
    private checkIyzipay;
    getHealth(): Promise<HealthResponse>;
    getDeepHealth(): Promise<DeepHealthResponse>;
}
