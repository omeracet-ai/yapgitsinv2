import { HealthService, HealthResponse, DeepHealthResponse } from './health.service';
export declare class HealthController {
    private readonly health;
    constructor(health: HealthService);
    get(): Promise<HealthResponse>;
    getDeep(): Promise<DeepHealthResponse>;
}
