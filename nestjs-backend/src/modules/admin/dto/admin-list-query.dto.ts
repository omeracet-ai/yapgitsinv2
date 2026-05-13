import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * P191/4 — Shared admin list pagination query.
 * Used by GET /admin/users, /admin/providers, /admin/jobs.
 *
 * page  : 1-indexed (default 1)
 * limit : 1..100 (default 20)
 * search: free-text (fullName/email/title — endpoint specific)
 * status: optional status filter (jobs only for now, but reusable)
 */
export class AdminListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function normalizePaging(q: AdminListQueryDto): {
  page: number;
  limit: number;
  skip: number;
  take: number;
} {
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(q.limit) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function buildPaginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
