import { NotificationsService } from './notifications.service';
import { FcmService } from './fcm.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
export declare class NotificationsController {
    private readonly svc;
    private readonly fcm;
    constructor(svc: NotificationsService, fcm: FcmService);
    getAll(req: AuthenticatedRequest): Promise<import("./notification.entity").Notification[]>;
    unreadCount(req: AuthenticatedRequest): Promise<{
        count: number;
    }>;
    subscribe(req: AuthenticatedRequest, body: {
        token?: string;
        enabled?: boolean;
    }): Promise<{
        ok: boolean;
        fcmEnabled: boolean;
    }>;
    readAll(req: AuthenticatedRequest): Promise<{
        ok: boolean;
    }>;
    markRead(id: string, req: AuthenticatedRequest): Promise<{
        ok: boolean;
    }>;
}
