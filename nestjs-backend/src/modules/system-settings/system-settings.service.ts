import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './system-setting.entity';

@Injectable()
export class SystemSettingsService {
  private cache = new Map<string, string>();

  constructor(
    @InjectRepository(SystemSetting)
    private readonly repo: Repository<SystemSetting>,
  ) {}

  async get(key: string, defaultValue: string): Promise<string> {
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;
    const row = await this.repo.findOne({ where: { key } });
    const value = row?.value ?? defaultValue;
    this.cache.set(key, value);
    return value;
  }

  async set(key: string, value: string, adminId?: string): Promise<SystemSetting> {
    const existing = await this.repo.findOne({ where: { key } });
    const entity = existing
      ? Object.assign(existing, { value, updatedBy: adminId ?? null })
      : this.repo.create({ key, value, updatedBy: adminId ?? null });
    const saved = await this.repo.save(entity);
    this.cache.set(key, value);
    return saved;
  }

  async getAll(): Promise<SystemSetting[]> {
    return this.repo.find({ order: { key: 'ASC' } });
  }

  invalidate(key?: string) {
    if (key) this.cache.delete(key);
    else this.cache.clear();
  }
}
