import { User } from '../users/user.entity';
export declare class Reputation {
    id: string;
    tenantId: string | null;
    userId: string;
    user: User;
    type: 'review' | 'job_completion' | 'job_cancellation' | 'badge_awarded' | 'manual_adjustment';
    referenceId: string | null;
    pointsChange: number;
    previousScore: number | null;
    newScore: number;
    metadata: Record<string, unknown> | null;
    isPublic: boolean;
    createdAt: Date;
}
