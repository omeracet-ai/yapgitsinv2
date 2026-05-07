import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CancellationPolicy,
  CancellationAppliesTo,
  CancellationAppliesAtStage,
} from './cancellation-policy.entity';

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

@Injectable()
export class CancellationService implements OnModuleInit {
  constructor(
    @InjectRepository(CancellationPolicy)
    private readonly repo: Repository<CancellationPolicy>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
  }

  async findApplicable(
    input: FindApplicableInput,
  ): Promise<CancellationPolicy | null> {
    const elapsed = Math.max(0, Math.floor(input.hoursElapsedSinceAccept || 0));

    // Build with QueryBuilder so we can express the OR for appliesAtStage cleanly.
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.isActive = :active', { active: true })
      .andWhere('p.appliesTo = :appliesTo', { appliesTo: input.appliesTo })
      .andWhere(
        '(p.appliesAtStage = :anyStage OR p.appliesAtStage = :stage)',
        {
          anyStage: CancellationAppliesAtStage.ANY,
          stage: input.appliesAtStage,
        },
      )
      .andWhere('p.minHoursElapsed <= :elapsed', { elapsed })
      .andWhere('(p.maxHoursElapsed IS NULL OR p.maxHoursElapsed >= :elapsed)', {
        elapsed,
      })
      .orderBy('p.priority', 'ASC')
      .limit(1);

    const result = await qb.getOne();
    return result || null;
  }

  calculateRefund(
    amount: number,
    policy: CancellationPolicy,
  ): RefundCalculation {
    const safeAmount = Number(amount) || 0;
    const refundAmount =
      Math.round(safeAmount * (policy.refundPercentage / 100) * 100) / 100;
    const taskerAmount =
      Math.round(
        safeAmount * (policy.taskerCompensationPercentage / 100) * 100,
      ) / 100;
    const platformFee =
      Math.round(safeAmount * (policy.platformFeePercentage / 100) * 100) / 100;
    return { refundAmount, taskerAmount, platformFee };
  }

  findAll(): Promise<CancellationPolicy[]> {
    return this.repo.find({
      order: { priority: 'ASC', createdAt: 'ASC' },
    });
  }

  async findById(id: string): Promise<CancellationPolicy> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) {
      throw new NotFoundException(`CancellationPolicy ${id} not found`);
    }
    return found;
  }

  async create(dto: CreatePolicyDto): Promise<CancellationPolicy> {
    const entity = this.repo.create({
      name: dto.name,
      appliesTo: dto.appliesTo as CancellationAppliesTo,
      appliesAtStage:
        (dto.appliesAtStage as CancellationAppliesAtStage) ??
        CancellationAppliesAtStage.ANY,
      minHoursElapsed: dto.minHoursElapsed ?? 0,
      maxHoursElapsed:
        dto.maxHoursElapsed === undefined ? null : dto.maxHoursElapsed,
      refundPercentage: dto.refundPercentage,
      taskerCompensationPercentage: dto.taskerCompensationPercentage ?? 0,
      platformFeePercentage: dto.platformFeePercentage ?? 0,
      priority: dto.priority ?? 100,
      isActive: dto.isActive ?? true,
      description: dto.description ?? null,
    });
    return this.repo.save(entity);
  }

  async update(
    id: string,
    dto: UpdatePolicyDto,
  ): Promise<CancellationPolicy> {
    const existing = await this.findById(id);
    Object.assign(existing, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.appliesTo !== undefined
        ? { appliesTo: dto.appliesTo as CancellationAppliesTo }
        : {}),
      ...(dto.appliesAtStage !== undefined
        ? { appliesAtStage: dto.appliesAtStage as CancellationAppliesAtStage }
        : {}),
      ...(dto.minHoursElapsed !== undefined
        ? { minHoursElapsed: dto.minHoursElapsed }
        : {}),
      ...(dto.maxHoursElapsed !== undefined
        ? { maxHoursElapsed: dto.maxHoursElapsed }
        : {}),
      ...(dto.refundPercentage !== undefined
        ? { refundPercentage: dto.refundPercentage }
        : {}),
      ...(dto.taskerCompensationPercentage !== undefined
        ? {
            taskerCompensationPercentage: dto.taskerCompensationPercentage,
          }
        : {}),
      ...(dto.platformFeePercentage !== undefined
        ? { platformFeePercentage: dto.platformFeePercentage }
        : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
    });
    return this.repo.save(existing);
  }

  async delete(id: string): Promise<CancellationPolicy> {
    const existing = await this.findById(id);
    existing.isActive = false;
    return this.repo.save(existing);
  }

  async seedDefaults(): Promise<void> {
    const count = await this.repo.count();
    if (count > 0) return;

    const defaults: CreatePolicyDto[] = [
      {
        name: 'Müşteri iptal — atama öncesi',
        appliesTo: CancellationAppliesTo.CUSTOMER_CANCEL,
        appliesAtStage: CancellationAppliesAtStage.BEFORE_ASSIGNMENT,
        minHoursElapsed: 0,
        maxHoursElapsed: null,
        refundPercentage: 100,
        taskerCompensationPercentage: 0,
        platformFeePercentage: 0,
        priority: 10,
        description:
          'Henüz teklif kabul edilmediği için müşteri tam iade alır.',
      },
      {
        name: 'Müşteri iptal — atama sonrası 24 saat içinde',
        appliesTo: CancellationAppliesTo.CUSTOMER_CANCEL,
        appliesAtStage: CancellationAppliesAtStage.AFTER_ASSIGNMENT,
        minHoursElapsed: 0,
        maxHoursElapsed: 24,
        refundPercentage: 90,
        taskerCompensationPercentage: 0,
        platformFeePercentage: 10,
        priority: 20,
        description:
          'Atama yapıldıktan sonraki ilk 24 saat içinde iptal: %90 iade, %10 platform ücreti.',
      },
      {
        name: 'Müşteri iptal — atama sonrası 24 saat geçmiş',
        appliesTo: CancellationAppliesTo.CUSTOMER_CANCEL,
        appliesAtStage: CancellationAppliesAtStage.AFTER_ASSIGNMENT,
        minHoursElapsed: 24,
        maxHoursElapsed: null,
        refundPercentage: 50,
        taskerCompensationPercentage: 50,
        platformFeePercentage: 0,
        priority: 30,
        description:
          'Atamadan 24 saat sonrası iptal: %50 iade, %50 ustaya tazminat.',
      },
      {
        name: 'Müşteri iptal — iş başlamış',
        appliesTo: CancellationAppliesTo.CUSTOMER_CANCEL,
        appliesAtStage: CancellationAppliesAtStage.IN_PROGRESS,
        minHoursElapsed: 0,
        maxHoursElapsed: null,
        refundPercentage: 0,
        taskerCompensationPercentage: 100,
        platformFeePercentage: 0,
        priority: 40,
        description:
          'İş başladıktan sonra müşteri iptal ederse usta tam ödeme alır.',
      },
      {
        name: 'Usta iptal — her zaman',
        appliesTo: CancellationAppliesTo.TASKER_CANCEL,
        appliesAtStage: CancellationAppliesAtStage.ANY,
        minHoursElapsed: 0,
        maxHoursElapsed: null,
        refundPercentage: 100,
        taskerCompensationPercentage: 0,
        platformFeePercentage: 0,
        priority: 50,
        description: 'Usta iptal ettiğinde müşteri her durumda tam iade alır.',
      },
      {
        name: 'Karşılıklı iptal',
        appliesTo: CancellationAppliesTo.MUTUAL_CANCEL,
        appliesAtStage: CancellationAppliesAtStage.ANY,
        minHoursElapsed: 0,
        maxHoursElapsed: null,
        refundPercentage: 100,
        taskerCompensationPercentage: 0,
        platformFeePercentage: 0,
        priority: 60,
        description: 'İki taraf anlaşarak iptal ederse müşteri tam iade alır.',
      },
    ];

    for (const dto of defaults) {
      await this.create(dto);
    }
  }

}
