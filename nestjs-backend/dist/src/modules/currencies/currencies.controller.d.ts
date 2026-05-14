import { Repository } from 'typeorm';
import { CurrenciesService } from './currencies.service';
import { User } from '../users/user.entity';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
export declare class CurrenciesController {
    private readonly svc;
    private readonly usersRepo;
    constructor(svc: CurrenciesService, usersRepo: Repository<User>);
    list(): Promise<import("./currency.entity").Currency[]>;
    setMyCurrency(req: AuthenticatedRequest, body: {
        code: string;
    }): Promise<{
        preferredCurrency: string;
    }>;
    adminUpdateRate(code: string, body: {
        rateToBase: number;
    }): Promise<import("./currency.entity").Currency>;
}
