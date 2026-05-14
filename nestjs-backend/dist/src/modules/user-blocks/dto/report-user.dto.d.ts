export declare const REPORT_REASONS: readonly ["spam", "harassment", "fraud", "inappropriate", "fake_profile", "inappropriate_content", "other"];
export declare class ReportUserDto {
    reason: (typeof REPORT_REASONS)[number];
    description?: string;
}
export declare class UpdateReportStatusDto {
    status: 'reviewed' | 'dismissed';
    adminNote?: string;
}
