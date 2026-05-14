import { User } from '../users/user.entity';
export declare class AdminAuditLog {
    id: string;
    tenantId: string | null;
    adminUserId: string | null;
    actorEmail: string | null;
    actor?: User | null;
    action: string;
    targetType: string | null;
    targetId: string | null;
    payload: Record<string, unknown> | null;
    ip: string | null;
    userAgent: string | null;
    createdAt: Date;
}
