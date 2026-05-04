import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly svc;
    constructor(svc: NotificationsService);
    getAll(req: any): Promise<import("./notification.entity").Notification[]>;
    unreadCount(req: any): Promise<{
        count: number;
    }>;
    readAll(req: any): Promise<{
        ok: boolean;
    }>;
    markRead(id: string, req: any): Promise<{
        ok: boolean;
    }>;
}
