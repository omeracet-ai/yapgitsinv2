import { Repository } from 'typeorm';
import { AvailabilitySlot } from './availability-slot.entity';
import { AvailabilityBlackout } from './availability-blackout.entity';
interface AddSlotDto {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    recurringUntil?: string | null;
}
interface AddBlackoutDto {
    startDate: string;
    endDate: string;
    reason?: string | null;
}
export declare class AvailabilityService {
    private readonly slotRepo;
    private readonly blackoutRepo;
    constructor(slotRepo: Repository<AvailabilitySlot>, blackoutRepo: Repository<AvailabilityBlackout>);
    getSlots(userId: string): Promise<AvailabilitySlot[]>;
    addSlot(userId: string, dto: AddSlotDto): Promise<AvailabilitySlot>;
    updateSlot(slotId: string, userId: string, partial: Partial<AddSlotDto> & {
        isActive?: boolean;
    }): Promise<AvailabilitySlot>;
    removeSlot(slotId: string, userId: string): Promise<{
        deleted: true;
    }>;
    getBlackouts(userId: string): Promise<AvailabilityBlackout[]>;
    addBlackout(userId: string, dto: AddBlackoutDto): Promise<AvailabilityBlackout>;
    removeBlackout(blackoutId: string, userId: string): Promise<{
        deleted: true;
    }>;
    isAvailable(userId: string, dateTime: Date): Promise<boolean>;
    findAvailableTaskers(dateTime: Date, _category?: string, _city?: string): Promise<string[]>;
    getCalendar(userId: string): Promise<{
        slots: AvailabilitySlot[];
        blackouts: AvailabilityBlackout[];
    }>;
}
export {};
