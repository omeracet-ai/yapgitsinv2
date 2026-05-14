import { Strategy } from 'passport-jwt';
import type { Cache } from 'cache-manager';
import { JwtPayload, AuthUser } from '../../common/types/auth.types';
import { UsersService } from '../users/users.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly usersService;
    private readonly cacheManager;
    private static readonly TOKEN_VER_TTL_MS;
    constructor(usersService: UsersService, cacheManager: Cache);
    private cacheKey;
    validate(payload: JwtPayload): Promise<AuthUser>;
}
export {};
