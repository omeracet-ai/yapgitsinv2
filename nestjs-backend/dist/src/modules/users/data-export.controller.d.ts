import type { Response } from 'express';
import { DataExportService } from './data-export.service';
export declare class DataExportController {
    private readonly svc;
    constructor(svc: DataExportService);
    export(req: any, res: Response): Promise<void>;
}
