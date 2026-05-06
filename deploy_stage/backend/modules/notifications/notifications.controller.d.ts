import { NotificationsService } from './notifications.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
export declare class NotificationsController {
    private readonly svc;
    constructor(svc: NotificationsService);
    getAll(req: AuthenticatedRequest): Promise<import("./notification.entity").Notification[]>;
    unreadCount(req: AuthenticatedRequest): Promise<{
        count: number;
    }>;
    readAll(req: AuthenticatedRequest): Promise<{
        ok: boolean;
    }>;
    markRead(id: string, req: AuthenticatedRequest): Promise<{
        ok: boolean;
    }>;
}
