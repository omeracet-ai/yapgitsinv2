export declare class AvailabilitySlot {
    id: string;
    userId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isRecurring: boolean;
    recurringUntil: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
