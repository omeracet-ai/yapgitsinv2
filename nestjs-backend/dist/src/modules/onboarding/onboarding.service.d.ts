import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { OnboardingSlide } from './onboarding-slide.entity';
export declare class OnboardingService implements OnModuleInit {
    private readonly repo;
    constructor(repo: Repository<OnboardingSlide>);
    onModuleInit(): Promise<void>;
    findActive(): Promise<OnboardingSlide[]>;
    findAll(): Promise<OnboardingSlide[]>;
    create(dto: Partial<OnboardingSlide>): Promise<OnboardingSlide>;
    update(id: string, dto: Partial<OnboardingSlide>): Promise<OnboardingSlide>;
    remove(id: string): Promise<void>;
    reorder(ids: string[]): Promise<void>;
}
