import { OnboardingService } from './onboarding.service';
import { OnboardingSlide } from './onboarding-slide.entity';
export declare class OnboardingController {
    private readonly svc;
    constructor(svc: OnboardingService);
    findActive(): Promise<OnboardingSlide[]>;
    findAll(): Promise<OnboardingSlide[]>;
    create(dto: Partial<OnboardingSlide>): Promise<OnboardingSlide>;
    reorder(body: {
        ids: string[];
    }): Promise<void>;
    update(id: string, dto: Partial<OnboardingSlide>): Promise<OnboardingSlide>;
    remove(id: string): Promise<void>;
}
