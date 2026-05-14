import { UserBlocksService } from './user-blocks.service';
import { ReportUserDto } from './dto/report-user.dto';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
export declare class UserBlocksController {
    private readonly svc;
    constructor(svc: UserBlocksService);
    blockMe(req: AuthenticatedRequest, userId: string): Promise<{
        blocked: boolean;
        blockedId: string;
    }>;
    unblockMe(req: AuthenticatedRequest, userId: string): Promise<{
        blocked: false;
        blockedId: string;
    }>;
    listMyBlocks(req: AuthenticatedRequest): Promise<{
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
    reportUser(req: AuthenticatedRequest, userId: string, body: ReportUserDto): Promise<{
        id: string;
        status: import("./user-report.entity").UserReportStatus;
    }>;
    block(req: AuthenticatedRequest, id: string): Promise<import("./user-block.entity").UserBlock>;
    unblock(req: AuthenticatedRequest, id: string): Promise<{
        ok: true;
    }>;
    listBlocked(req: AuthenticatedRequest): Promise<{
        id: string;
        blockedUserId: string;
        createdAt: Date;
        fullName: string | null;
        profileImageUrl: string | null;
    }[]>;
}
