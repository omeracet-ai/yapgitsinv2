import { Repository } from 'typeorm';
import { UserBlock } from './user-block.entity';
import { UserReport, UserReportReason, UserReportStatus } from './user-report.entity';
import { User } from '../users/user.entity';
export declare class UserBlocksService {
    private blocksRepo;
    private reportsRepo;
    private usersRepo;
    constructor(blocksRepo: Repository<UserBlock>, reportsRepo: Repository<UserReport>, usersRepo: Repository<User>);
    block(blockerId: string, blockedUserId: string): Promise<UserBlock>;
    unblock(blockerId: string, blockedUserId: string): Promise<{
        ok: true;
    }>;
    unblockIdempotent(blockerId: string, blockedUserId: string): Promise<{
        blocked: false;
        blockedId: string;
    }>;
    listBlockedPaged(blockerId: string): Promise<{
        data: {
            id: string;
            blockedId: string;
            blockedUser: {
                id: string;
                fullName: string;
                profileImageUrl: string;
            } | null;
            createdAt: Date;
        }[];
        total: number;
    }>;
    isBlocked(blockerId: string, blockedUserId: string): Promise<boolean>;
    isEitherBlocked(userA: string, userB: string): Promise<boolean>;
    listBlocked(blockerId: string): Promise<{
        id: string;
        blockedUserId: string;
        createdAt: Date;
        fullName: string | null;
        profileImageUrl: string | null;
    }[]>;
    listBlockedIds(blockerId: string): Promise<string[]>;
    report(reporterId: string, reportedUserId: string, reason: UserReportReason, description?: string): Promise<UserReport>;
    findReports(status?: UserReportStatus): Promise<UserReport[]>;
    findReportsPaged(status?: UserReportStatus, page?: number, limit?: number): Promise<{
        data: UserReport[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    updateReportStatus(reportId: string, status: UserReportStatus, adminNote?: string): Promise<UserReport>;
}
