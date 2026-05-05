import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from './provider.entity';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private repo: Repository<Provider>,
  ) {}

  findAll(): Promise<Provider[]> {
    return this.repo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async setVerified(id: string, isVerified: boolean): Promise<Provider> {
    const provider = await this.repo.findOne({ where: { id } });
    if (!provider) throw new NotFoundException('Sağlayıcı bulunamadı');
    await this.repo.update(id, { isVerified });
    return { ...provider, isVerified };
  }

  async setFeaturedOrder(id: string, featuredOrder: number | null): Promise<Provider> {
    const provider = await this.repo.findOne({ where: { id } });
    if (!provider) throw new NotFoundException('Sağlayıcı bulunamadı');
    await this.repo.update(id, { featuredOrder });
    return { ...provider, featuredOrder };
  }
}
