import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnboardingSlide } from './onboarding-slide.entity';

@Injectable()
export class OnboardingService implements OnModuleInit {
  constructor(
    @InjectRepository(OnboardingSlide)
    private readonly repo: Repository<OnboardingSlide>,
  ) {}

  async onModuleInit() {
    const count = await this.repo.count();
    if (count === 0) {
      await this.repo.save([
        {
          title: 'Usta Bul, Hizmet Al',
          body: 'Temizlik, tadilat, tesisattan nakliyata kadar binlerce doğrulanmış usta tek platformda.',
          emoji: '🛠️',
          imageUrl: null,
          gradientStart: '#007DFE',
          gradientEnd: '#0056B3',
          sortOrder: 0,
          isActive: true,
        },
        {
          title: 'Güvenli & Hızlı',
          body: 'Kimlik doğrulamalı ustalar, şeffaf fiyatlar ve güvenli ödeme sistemi ile içiniz rahat.',
          emoji: '🔒',
          imageUrl: null,
          gradientStart: '#2D3E50',
          gradientEnd: '#1a2530',
          sortOrder: 1,
          isActive: true,
        },
        {
          title: 'İlan Ver, Teklif Al',
          body: 'İhtiyacınızı ilan olarak paylaşın, uygun ustalar size teklif getirsin — tamamen ücretsiz.',
          emoji: '⭐',
          imageUrl: null,
          gradientStart: '#00C9A7',
          gradientEnd: '#008f75',
          sortOrder: 2,
          isActive: true,
        },
      ]);
    }
  }

  findActive(): Promise<OnboardingSlide[]> {
    return this.repo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  findAll(): Promise<OnboardingSlide[]> {
    return this.repo.find({ order: { sortOrder: 'ASC' } });
  }

  async create(dto: Partial<OnboardingSlide>): Promise<OnboardingSlide> {
    const slide = this.repo.create(dto);
    return this.repo.save(slide);
  }

  async update(id: string, dto: Partial<OnboardingSlide>): Promise<OnboardingSlide> {
    await this.repo.update(id, dto);
    const slide = await this.repo.findOneBy({ id });
    if (!slide) throw new NotFoundException('Slide bulunamadı');
    return slide;
  }

  async remove(id: string): Promise<void> {
    const slide = await this.repo.findOneBy({ id });
    if (!slide) throw new NotFoundException('Slide bulunamadı');
    await this.repo.remove(slide);
  }

  async reorder(ids: string[]): Promise<void> {
    await Promise.all(
      ids.map((id, index) => this.repo.update(id, { sortOrder: index })),
    );
  }
}
