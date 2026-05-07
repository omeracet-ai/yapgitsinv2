import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  DisputeResolutionStatus,
  DisputeType,
  JobDispute,
} from './job-dispute.entity';
import { EscrowService } from '../escrow/escrow.service';

export interface CreateDisputeDto {
  jobId: string;
  raisedByUserId: string;
  counterPartyUserId: string;
  escrowId?: string | null;
  disputeType: DisputeType;
  reason: string;
  evidenceUrls?: string[] | null;
}

export interface ResolveDisputeDto {
  status:
    | DisputeResolutionStatus.RESOLVED_CUSTOMER
    | DisputeResolutionStatus.RESOLVED_TASKER
    | DisputeResolutionStatus.RESOLVED_SPLIT;
  notes: string;
  refundAmount?: number;
  taskerCompensationAmount?: number;
}

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    @InjectRepository(JobDispute)
    private readonly repo: Repository<JobDispute>,
    private readonly escrowService: EscrowService,
  ) {}

  async create(dto: CreateDisputeDto): Promise<JobDispute> {
    const entity = this.repo.create({
      jobId: dto.jobId,
      raisedByUserId: dto.raisedByUserId,
      counterPartyUserId: dto.counterPartyUserId,
      escrowId: dto.escrowId ?? null,
      disputeType: dto.disputeType,
      reason: dto.reason,
      evidenceUrls: dto.evidenceUrls ?? null,
      resolutionStatus: DisputeResolutionStatus.OPEN,
    });
    return this.repo.save(entity);
  }

  findOpenDisputes(): Promise<JobDispute[]> {
    return this.repo.find({
      where: {
        resolutionStatus: In([
          DisputeResolutionStatus.OPEN,
          DisputeResolutionStatus.UNDER_REVIEW,
        ]),
      },
      order: { raisedAt: 'DESC' },
    });
  }

  async findById(
    id: string,
    requesterId: string,
    isAdmin: boolean,
  ): Promise<JobDispute> {
    const d = await this.repo.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Dispute not found');
    if (
      !isAdmin &&
      d.raisedByUserId !== requesterId &&
      d.counterPartyUserId !== requesterId
    ) {
      throw new ForbiddenException('Not a party to this dispute');
    }
    return d;
  }

  findByJob(jobId: string): Promise<JobDispute[]> {
    return this.repo.find({
      where: { jobId },
      order: { raisedAt: 'DESC' },
    });
  }

  findMine(userId: string): Promise<JobDispute[]> {
    return this.repo.find({
      where: [{ raisedByUserId: userId }, { counterPartyUserId: userId }],
      order: { raisedAt: 'DESC' },
    });
  }

  async markUnderReview(id: string, adminId: string): Promise<JobDispute> {
    const d = await this.repo.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Dispute not found');
    if (d.resolutionStatus !== DisputeResolutionStatus.OPEN) {
      throw new ForbiddenException('Dispute is not open');
    }
    d.resolutionStatus = DisputeResolutionStatus.UNDER_REVIEW;
    d.resolvedByAdminId = adminId;
    return this.repo.save(d);
  }

  async resolve(
    id: string,
    adminId: string,
    dto: ResolveDisputeDto,
  ): Promise<JobDispute> {
    const d = await this.repo.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Dispute not found');
    if (
      d.resolutionStatus === DisputeResolutionStatus.DISMISSED ||
      d.resolutionStatus === DisputeResolutionStatus.RESOLVED_CUSTOMER ||
      d.resolutionStatus === DisputeResolutionStatus.RESOLVED_TASKER ||
      d.resolutionStatus === DisputeResolutionStatus.RESOLVED_SPLIT
    ) {
      throw new ForbiddenException('Dispute already finalized');
    }
    d.resolutionStatus = dto.status;
    d.resolutionNotes = dto.notes;
    d.resolvedByAdminId = adminId;
    d.refundAmount = dto.refundAmount ?? null;
    d.taskerCompensationAmount = dto.taskerCompensationAmount ?? null;
    d.resolvedAt = new Date();
    return this.repo.save(d);
  }

  async dismiss(
    id: string,
    adminId: string,
    notes: string,
  ): Promise<JobDispute> {
    const d = await this.repo.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Dispute not found');
    d.resolutionStatus = DisputeResolutionStatus.DISMISSED;
    d.resolutionNotes = notes;
    d.resolvedByAdminId = adminId;
    d.resolvedAt = new Date();
    return this.repo.save(d);
  }

  /**
   * Apply admin resolution to escrow side-effects.
   * Call after resolve() once the dispute row reflects the decision.
   */
  async applyResolution(
    disputeId: string,
    adminId: string,
    decision: ResolveDisputeDto,
  ): Promise<void> {
    const d = await this.repo.findOne({ where: { id: disputeId } });
    if (!d) throw new NotFoundException('Dispute not found');
    if (!d.escrowId) return;

    try {
      if (decision.status === DisputeResolutionStatus.RESOLVED_CUSTOMER) {
        const escrow = await this.escrowService.getById(
          d.escrowId,
          adminId,
          'admin',
        );
        await this.escrowService.refund(
          d.escrowId,
          adminId,
          escrow.amount,
          'Uyuşmazlık müşteri lehine çözüldü',
          'admin',
        );
      } else if (decision.status === DisputeResolutionStatus.RESOLVED_TASKER) {
        await this.escrowService.release(
          d.escrowId,
          adminId,
          'Uyuşmazlık usta lehine çözüldü',
          'admin',
        );
      } else if (decision.status === DisputeResolutionStatus.RESOLVED_SPLIT) {
        if (
          decision.refundAmount === undefined ||
          decision.refundAmount === null
        ) {
          throw new ForbiddenException(
            'refundAmount is required for split resolution',
          );
        }
        await this.escrowService.refund(
          d.escrowId,
          adminId,
          decision.refundAmount,
          'Kısmi çözüm',
          'admin',
        );
      }
      // dismissed → no escrow change
    } catch (err) {
      this.logger.warn(
        `applyResolution escrow side-effect failed for dispute ${disputeId}: ${(err as Error)?.message ?? err}`,
      );
    }
  }
}
