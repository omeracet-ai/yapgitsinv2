import { ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
export declare class UserOrIpThrottlerGuard extends ThrottlerGuard {
    canActivate(context: ExecutionContext): Promise<boolean>;
    protected getTracker(req: Record<string, unknown>): Promise<string>;
}
