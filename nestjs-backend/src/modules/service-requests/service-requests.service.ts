import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceRequest } from './service-request.entity';
import { ServiceRequestApplication, ApplicationStatus } from './service-request-application.entity';

@Injectable()
export class ServiceRequestsService {
  constructor(
    @InjectRepository(ServiceRequest)
    private repo: Repository<ServiceRequest>,
    @InjectRepository(ServiceRequestApplication)
    private appRepo: Repository<ServiceRequestApplication>,
  ) {}

  findAll(category?: string): Promise<ServiceRequest[]> {
    const qb = this.repo
      .createQueryBuilder('sr')
      .leftJoinAndSelect('sr.user', 'user')
      .where('sr.status = :status', { status: 'open' })
      .orderBy(
        `CASE WHEN sr.featuredOrder IS NOT NULL THEN sr.featuredOrder ELSE 999 END`,
        'ASC',
      )
      .addOrderBy('sr.createdAt', 'DESC');

    if (category) {
      qb.andWhere('sr.category = :category', { category });
    }
    return qb.getMany();
  }

  findById(id: string): Promise<ServiceRequest | null> {
    return this.repo.findOne({ where: { id }, relations: ['user'] });
  }

  findByUser(userId: string): Promise<ServiceRequest[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(userId: string, data: Partial<ServiceRequest>): Promise<ServiceRequest> {
    const sr = this.repo.create({ ...data, userId });
    return this.repo.save(sr);
  }

  async update(id: string, userId: string, data: Partial<ServiceRequest>): Promise<ServiceRequest> {
    const sr = await this.repo.findOne({ where: { id } });
    if (!sr) throw new NotFoundException('İlan bulunamadı');
    if (sr.userId !== userId) throw new ForbiddenException('Yetkisiz');
    Object.assign(sr, data);
    return this.repo.save(sr);
  }

  async remove(id: string, userId: string): Promise<void> {
    const sr = await this.repo.findOne({ where: { id } });
    if (!sr) throw new NotFoundException('İlan bulunamadı');
    if (sr.userId !== userId) throw new ForbiddenException('Yetkisiz');
    await this.repo.delete(id);
  }

  async setFeaturedOrder(id: string, featuredOrder: number | null): Promise<void> {
    await this.repo.update(id, { featuredOrder });
  }

  // ─── Başvuru (Application) yönetimi ──────────────────────────────────────

  async createApplication(
    serviceRequestId: string,
    userId: string,
    data: { message?: string; price?: number },
  ): Promise<ServiceRequestApplication> {
    const sr = await this.repo.findOne({ where: { id: serviceRequestId } });
    if (!sr) throw new NotFoundException('Hizmet ilanı bulunamadı');
    // İlan sahibi başvuramaz
    if (sr.userId === userId) throw new ForbiddenException('Kendi ilanınıza başvuramazsınız');
    const app = this.appRepo.create({
      serviceRequestId,
      userId,
      message: data.message ?? null,
      price:   data.price   ?? null,
      status:  ApplicationStatus.PENDING,
    });
    return this.appRepo.save(app);
  }

  async getApplications(serviceRequestId: string): Promise<ServiceRequestApplication[]> {
    return this.appRepo.find({
      where: { serviceRequestId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async getMyApplications(userId: string): Promise<ServiceRequestApplication[]> {
    return this.appRepo.find({
      where: { userId },
      relations: ['serviceRequest'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateApplicationStatus(
    applicationId: string,
    requestUserId: string,
    status: ApplicationStatus,
  ): Promise<ServiceRequestApplication> {
    const app = await this.appRepo.findOne({ where: { id: applicationId }, relations: ['serviceRequest'] });
    if (!app) throw new NotFoundException('Başvuru bulunamadı');
    if (app.serviceRequest.userId !== requestUserId) throw new ForbiddenException('Yetkisiz');
    app.status = status;
    return this.appRepo.save(app);
  }
}
