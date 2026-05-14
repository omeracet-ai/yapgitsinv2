import { BoostService } from './boost.service';
import { BoostType } from './boost.entity';
export declare class BoostController {
    private readonly svc;
    constructor(svc: BoostService);
    packages(): {
        type: BoostType;
        tokenCost: number;
        durationHours: number;
        name: string;
        description: string;
    }[];
    my(req: {
        user: {
            id: string;
        };
    }): Promise<{
        active: import("./boost.entity").Boost[];
        history: import("./boost.entity").Boost[];
    }>;
    purchase(req: {
        user: {
            id: string;
        };
    }, body: {
        type?: string;
    }): Promise<{
        boost: import("./boost.entity").Boost;
        newTokenBalance: number;
    }>;
}
