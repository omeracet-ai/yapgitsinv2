import { Repository } from 'typeorm';
import { Dispute, GeneralDisputeStatus, GeneralDisputeType } from './dispute.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/user.entity';
import { DisputeMediationService } from '../ai/dispute-mediation.service';
export interface CreateDisputeDto {
    jobId?: string | null;
    bookingId?: string | null;
    againstUserId: string;
    type: GeneralDisputeType;
    description: string;
}
export interface ResolveDisputeDto {
    status: GeneralDisputeStatus.RESOLVED | GeneralDisputeStatus.DISMISSED;
    resolution: string;
}
export declare class GeneralDisputesService {
    private readonly repo;
    private readonly userRepo;
    private readonly notifications;
    private readonly mediation;
    constructor(repo: Repository<Dispute>, userRepo: Repository<User>, notifications: NotificationsService, mediation: DisputeMediationService);
    create(raisedBy: string, dto: CreateDisputeDto): Promise<Dispute>;
    findMine(userId: string): Promise<Dispute[]>;
    findForAdmin(status?: GeneralDisputeStatus, page?: number, limit?: number): Promise<{
        data: Dispute[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    resolve(id: string, adminId: string, dto: ResolveDisputeDto): Promise<Dispute>;
}
