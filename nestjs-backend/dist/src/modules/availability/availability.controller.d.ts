import { AvailabilityService } from './availability.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
export declare class AvailabilityController {
    private readonly svc;
    constructor(svc: AvailabilityService);
    getMe(req: AuthenticatedRequest): Promise<{
        slots: import("./availability-slot.entity").AvailabilitySlot[];
        blackouts: import("./availability-blackout.entity").AvailabilityBlackout[];
    }>;
    addSlot(req: AuthenticatedRequest, body: {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        recurringUntil?: string | null;
    }): Promise<import("./availability-slot.entity").AvailabilitySlot>;
    updateSlot(req: AuthenticatedRequest, id: string, body: {
        dayOfWeek?: number;
        startTime?: string;
        endTime?: string;
        recurringUntil?: string | null;
        isActive?: boolean;
    }): Promise<import("./availability-slot.entity").AvailabilitySlot>;
    removeSlot(req: AuthenticatedRequest, id: string): Promise<{
        deleted: true;
    }>;
    addBlackout(req: AuthenticatedRequest, body: {
        startDate: string;
        endDate: string;
        reason?: string | null;
    }): Promise<import("./availability-blackout.entity").AvailabilityBlackout>;
    removeBlackout(req: AuthenticatedRequest, id: string): Promise<{
        deleted: true;
    }>;
    getUser(userId: string): Promise<{
        slots: import("./availability-slot.entity").AvailabilitySlot[];
        blackouts: import("./availability-blackout.entity").AvailabilityBlackout[];
    }>;
    check(userId: string, date?: string): Promise<{
        available: boolean;
        date: string;
    }>;
}
