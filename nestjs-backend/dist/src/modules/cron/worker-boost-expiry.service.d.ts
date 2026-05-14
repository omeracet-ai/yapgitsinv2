import { BoostService } from '../boost/boost.service';
export declare class WorkerBoostExpiryService {
    private readonly boostSvc;
    private readonly logger;
    constructor(boostSvc: BoostService);
    run(): Promise<void>;
}
