import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkerInsurance } from './worker-insurance.entity';

export interface UpsertInsuranceDto {
  policyNumber: string;
  provider: string;
  coverageAmount: number;
  expiresAt: string | Date;
  documentUrl?: string | null;
}

@Injectable()
export class WorkerInsuranceService {
  constructor(
    @InjectRepository(WorkerInsurance)
    private repo: Repository<WorkerInsurance>,
  ) {}

  async getByUserId(userId: string): Promise<WorkerInsurance | null> {
    return this.repo.findOne({ where: { userId } });
  }

  async upsert(userId: string, dto: UpsertInsuranceDto): Promise<WorkerInsurance> {
    const policyNumber = (dto.policyNumber || '').trim();
    const provider = (dto.provider || '').trim();
    const coverage = Number(dto.coverageAmount);
    const expires = new Date(dto.expiresAt);
    if (!policyNumber || policyNumber.length > 50) {
      throw new BadRequestException('policyNumber gerekli (max 50)');
    }
    if (!provider || provider.length > 100) {
      throw new BadRequestException('provider gerekli (max 100)');
    }
    if (!isFinite(coverage) || coverage <= 0) {
      throw new BadRequestException('coverageAmount > 0 olmalı');
    }
    if (isNaN(expires.getTime())) {
      throw new BadRequestException('expiresAt geçersiz');
    }

    const existing = await this.repo.findOne({ where: { userId } });
    if (existing) {
      // Re-submission resets verification state
      existing.policyNumber = policyNumber;
      existing.provider = provider;
      existing.coverageAmount = coverage;
      existing.expiresAt = expires;
      existing.documentUrl = dto.documentUrl ?? existing.documentUrl ?? null;
      existing.verified = false;
      existing.verifiedBy = null;
      existing.verifiedAt = null;
      return this.repo.save(existing);
    }
    const created = this.repo.create({
      userId,
      policyNumber,
      provider,
      coverageAmount: coverage,
      expiresAt: expires,
      documentUrl: dto.documentUrl ?? null,
      verified: false,
    });
    return this.repo.save(created);
  }

  async remove(userId: string): Promise<{ ok: true }> {
    await this.repo.delete({ userId });
    return { ok: true };
  }

  async setVerified(
    userId: string,
    verified: boolean,
    adminId: string,
  ): Promise<WorkerInsurance> {
    const ins = await this.repo.findOne({ where: { userId } });
    if (!ins) throw new NotFoundException('Sigorta kaydı bulunamadı');
    ins.verified = verified;
    ins.verifiedBy = verified ? adminId : null;
    ins.verifiedAt = verified ? new Date() : null;
    return this.repo.save(ins);
  }

  /** Phase 119: a worker is "insured" iff verified=true AND not expired. */
  isInsured(ins: WorkerInsurance | null | undefined): boolean {
    if (!ins) return false;
    if (!ins.verified) return false;
    const exp = ins.expiresAt instanceof Date ? ins.expiresAt : new Date(ins.expiresAt);
    return exp.getTime() > Date.now();
  }

  /** Public payload — only safe fields. */
  toPublic(ins: WorkerInsurance) {
    return {
      provider: ins.provider,
      coverageAmount: ins.coverageAmount,
      expiresAt: ins.expiresAt,
      verified: ins.verified,
    };
  }
}
