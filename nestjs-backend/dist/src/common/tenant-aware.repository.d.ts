import { SelectQueryBuilder, Repository, ObjectLiteral, FindOptionsWhere } from 'typeorm';
export declare function applyTenantFilter<T extends ObjectLiteral>(qb: SelectQueryBuilder<T>, alias: string, tenantId: string | null | undefined): SelectQueryBuilder<T>;
export declare function withTenant<T extends ObjectLiteral>(where: FindOptionsWhere<T> | FindOptionsWhere<T>[], tenantId: string | null | undefined): FindOptionsWhere<T> | FindOptionsWhere<T>[];
export declare function findAllForTenant<T extends ObjectLiteral>(repo: Repository<T>, tenantId: string | null | undefined, alias?: string): Promise<T[]>;
