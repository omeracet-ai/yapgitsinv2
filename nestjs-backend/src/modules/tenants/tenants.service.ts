import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';

export const DEFAULT_TENANT_SLUG = 'tr';

@Injectable()
export class TenantsService implements OnModuleInit {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async onModuleInit(): Promise<void> {
    const existing = await this.tenantRepo.findOne({ where: { slug: DEFAULT_TENANT_SLUG } });
    if (!existing) {
      await this.tenantRepo.save(
        this.tenantRepo.create({
          slug: DEFAULT_TENANT_SLUG,
          brandName: 'Yapgitsin',
          subdomain: 'yapgitsin.tr',
          theme: { primary: '#007DFE', accent: '#FFA000' },
          defaultCurrency: 'TRY',
          defaultLocale: 'tr-TR',
          isActive: true,
        }),
      );
    }
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantRepo.findOne({ where: { slug, isActive: true } });
  }

  async findBySubdomain(subdomain: string): Promise<Tenant | null> {
    return this.tenantRepo.findOne({ where: { subdomain, isActive: true } });
  }

  async findById(id: string): Promise<Tenant> {
    const t = await this.tenantRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Tenant not found');
    return t;
  }

  async list(): Promise<Tenant[]> {
    return this.tenantRepo.find({ order: { createdAt: 'ASC' } });
  }

  async create(data: Partial<Tenant>): Promise<Tenant> {
    return this.tenantRepo.save(this.tenantRepo.create(data));
  }

  async update(id: string, data: Partial<Tenant>): Promise<Tenant> {
    await this.tenantRepo.update({ id }, data);
    return this.findById(id);
  }

  async getDefault(): Promise<Tenant | null> {
    return this.findBySlug(DEFAULT_TENANT_SLUG);
  }
}
