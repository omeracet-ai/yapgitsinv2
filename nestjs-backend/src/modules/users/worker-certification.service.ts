import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkerCertification } from './worker-certification.entity';

export interface CreateCertificationDto {
  name: string;
  issuer: string;
  issuedAt: string | Date;
  expiresAt?: string | Date | null;
  documentUrl?: string | null;
}

@Injectable()
export class WorkerCertificationService {
  constructor(
    @InjectRepository(WorkerCertification)
    private repo: Repository<WorkerCertification>,
  ) {}

  async listOwn(userId: string): Promise<WorkerCertification[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async listPublic(userId: string): Promise<WorkerCertification[]> {
    return this.repo.find({
      where: { userId, verified: true },
      order: { createdAt: 'DESC' },
    });
  }

  async create(userId: string, dto: CreateCertificationDto): Promise<WorkerCertification> {
    const name = (dto.name || '').trim();
    const issuer = (dto.issuer || '').trim();
    if (!name || name.length > 200) throw new BadRequestException('name gerekli (max 200)');
    if (!issuer || issuer.length > 200) throw new BadRequestException('issuer gerekli (max 200)');
    const issued = new Date(dto.issuedAt);
    if (isNaN(issued.getTime())) throw new BadRequestException('issuedAt geçersiz');
    let expires: Date | null = null;
    if (dto.expiresAt) {
      expires = new Date(dto.expiresAt);
      if (isNaN(expires.getTime())) throw new BadRequestException('expiresAt geçersiz');
    }
    const created = this.repo.create({
      userId,
      name,
      issuer,
      issuedAt: issued,
      expiresAt: expires,
      documentUrl: dto.documentUrl ?? null,
      verified: false,
    });
    return this.repo.save(created);
  }

  async deleteOwn(userId: string, certId: string): Promise<{ ok: true }> {
    const cert = await this.repo.findOne({ where: { id: certId } });
    if (!cert) throw new NotFoundException('Sertifika bulunamadı');
    if (cert.userId !== userId) throw new ForbiddenException('Bu sertifika size ait değil');
    await this.repo.delete({ id: certId });
    return { ok: true };
  }

  async listPending(): Promise<WorkerCertification[]> {
    return this.repo.find({ where: { verified: false }, order: { createdAt: 'ASC' } });
  }

  async setVerified(
    certId: string,
    verified: boolean,
    adminId: string,
    adminNote?: string,
  ): Promise<WorkerCertification> {
    const cert = await this.repo.findOne({ where: { id: certId } });
    if (!cert) throw new NotFoundException('Sertifika bulunamadı');
    cert.verified = verified;
    cert.verifiedBy = verified ? adminId : null;
    cert.verifiedAt = verified ? new Date() : null;
    if (adminNote !== undefined) cert.adminNote = adminNote || null;
    return this.repo.save(cert);
  }

  /** Phase 159: badge eligibility — user has at least one verified, non-expired cert. */
  async hasVerifiedCertification(userId: string): Promise<boolean> {
    const certs = await this.repo.find({ where: { userId, verified: true } });
    if (certs.length === 0) return false;
    const now = Date.now();
    return certs.some((c) => !c.expiresAt || new Date(c.expiresAt).getTime() > now);
  }

  toPublic(c: WorkerCertification) {
    return {
      name: c.name,
      issuer: c.issuer,
      issuedAt: c.issuedAt,
      expiresAt: c.expiresAt,
      verified: c.verified,
    };
  }
}
