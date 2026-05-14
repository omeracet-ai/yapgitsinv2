export declare class AdminListQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
}
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export declare function normalizePaging(q: AdminListQueryDto): {
    page: number;
    limit: number;
    skip: number;
    take: number;
};
export declare function buildPaginated<T>(items: T[], total: number, page: number, limit: number): PaginatedResult<T>;
