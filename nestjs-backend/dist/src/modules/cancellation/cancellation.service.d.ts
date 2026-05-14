import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CancellationPolicy, CancellationAppliesTo, CancellationAppliesAtStage } from './cancellation-policy.entity';
export interface FindApplicableInput {
    appliesTo: CancellationAppliesTo | string;
    appliesAtStage: CancellationAppliesAtStage | string;
    hoursElapsedSinceAccept: number;
}
export interface RefundCalculation {
    refundAmount: number;
    taskerAmount: number;
    platformFee: number;
}
export interface CreatePolicyDto {
    name: string;
    appliesTo: CancellationAppliesTo | string;
    appliesAtStage?: CancellationAppliesAtStage | string;
    minHoursElapsed?: number;
    maxHoursElapsed?: number | null;
    refundPercentage: number;
    taskerCompensationPercentage?: number;
    platformFeePercentage?: number;
    priority?: number;
    isActive?: boolean;
    description?: string | null;
}
export type UpdatePolicyDto = Partial<CreatePolicyDto>;
export declare class CancellationService implements OnModuleInit {
    private readonly repo;
    constructor(repo: Repository<CancellationPolicy>);
    onModuleInit(): Promise<void>;
    findApplicable(input: FindApplicableInput): Promise<CancellationPolicy | null>;
    calculateRefund(amount: number, policy: CancellationPolicy): RefundCalculation;
    findAll(): Promise<CancellationPolicy[]>;
    findById(id: string): Promise<CancellationPolicy>;
    create(dto: CreatePolicyDto): Promise<CancellationPolicy>;
    update(id: string, dto: UpdatePolicyDto): Promise<CancellationPolicy>;
    delete(id: string): Promise<CancellationPolicy>;
    seedDefaults(): Promise<void>;
}
