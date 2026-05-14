export type UserReportReason = 'spam' | 'harassment' | 'fraud' | 'inappropriate' | 'fake_profile' | 'inappropriate_content' | 'other';
export type UserReportStatus = 'pending' | 'reviewed' | 'dismissed';
export declare class UserReport {
    id: string;
    reporterUserId: string;
    reportedUserId: string;
    reason: UserReportReason;
    description: string | null;
    status: UserReportStatus;
    adminNote: string | null;
    createdAt: Date;
    updatedAt: Date;
}
