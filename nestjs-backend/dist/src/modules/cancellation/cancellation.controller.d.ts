import { CancellationService } from './cancellation.service';
import type { CreatePolicyDto, UpdatePolicyDto } from './cancellation.service';
export declare class CancellationController {
    private readonly svc;
    constructor(svc: CancellationService);
    findAll(): Promise<import("./cancellation-policy.entity").CancellationPolicy[]>;
    findById(id: string): Promise<import("./cancellation-policy.entity").CancellationPolicy>;
    create(dto: CreatePolicyDto): Promise<import("./cancellation-policy.entity").CancellationPolicy>;
    update(id: string, dto: UpdatePolicyDto): Promise<import("./cancellation-policy.entity").CancellationPolicy>;
    delete(id: string): Promise<import("./cancellation-policy.entity").CancellationPolicy>;
}
