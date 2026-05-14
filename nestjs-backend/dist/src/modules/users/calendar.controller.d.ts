import { CalendarService } from './calendar.service';
export declare class CalendarController {
    private readonly svc;
    constructor(svc: CalendarService);
    getIcs(req: any): Promise<string>;
    createToken(req: any): Promise<{
        token: string;
        url: string;
    }>;
    revokeToken(req: any): Promise<{
        ok: true;
    }>;
}
export declare class CalendarPublicController {
    private readonly svc;
    constructor(svc: CalendarService);
    publicFeed(token: string, res: any): Promise<void>;
}
