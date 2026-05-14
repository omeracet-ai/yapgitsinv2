import { Repository } from 'typeorm';
import { AdminAuditLog } from './admin-audit-log.entity';
import { User } from '../users/user.entity';
export interface AuditLogStats {
    totalEntries: number;
    entriesPerDay: {
        date: string;
        count: number;
    }[];
    topActions: {
        action: string;
        count: number;
    }[];
    topAdmins: {
        adminUserId: string;
        adminName: string;
        count: number;
    }[];
    topTargetTypes: {
        targetType: string;
        count: number;
    }[];
}
export declare class AdminAuditService {
    private readonly repo;
    private readonly userRepo;
    private readonly logger;
    constructor(repo: Repository<AdminAuditLog>, userRepo: Repository<User>);
    logAction(adminUserId: string, action: string, targetType?: string, targetId?: string, payload?: Record<string, unknown>): Promise<void>;
    record(opts: {
        actor: {
            id: string;
            email?: string | null;
        } | null;
        action: string;
        targetType?: string | null;
        targetId?: string | null;
        payload?: Record<string, unknown> | null;
        req?: {
            ip?: string;
            headers?: Record<string, unknown>;
        } | null;
    }): Promise<void>;
    findOne(id: string): Promise<AdminAuditLog | null>;
    findFiltered(opts: {
        limit?: number;
        offset?: number;
        action?: string;
        targetType?: string;
        adminUserId?: string;
    }): Promise<{
        data: AdminAuditLog[];
        total: number;
    }>;
    findRecent(limit?: number, offset?: number): Promise<AdminAuditLog[]>;
    exportCsv(opts: {
        action?: string;
        targetType?: string;
        adminUserId?: string;
    }): Promise<string>;
    private clampDays;
    previewPurge(olderThanDaysInput: number): Promise<{
        wouldDelete: number;
        cutoffDate: string;
        olderThanDays: number;
    }>;
    purgeOlderThan(olderThanDaysInput: number, adminUserId: string): Promise<{
        deleted: number;
        cutoffDate: string;
        olderThanDays: number;
    }>;
    getStats(daysInput: number): Promise<AuditLogStats>;
}
