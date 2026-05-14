import type { Response } from 'express';
import { StatementsService } from './statements.service';
export declare class StatementsController {
    private readonly statementsService;
    constructor(statementsService: StatementsService);
    private parsePeriod;
    getMine(req: {
        user: {
            userId: string;
            sub?: string;
            id?: string;
        };
    }, yearRaw?: string, monthRaw?: string): Promise<import("./statements.service").MonthlyStatement>;
    downloadMine(req: {
        user: {
            userId: string;
            sub?: string;
            id?: string;
        };
    }, res: Response, yearRaw?: string, monthRaw?: string): Promise<void>;
}
