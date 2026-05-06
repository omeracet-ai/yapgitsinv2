"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const onboarding_slide_entity_1 = require("./onboarding-slide.entity");
let OnboardingService = class OnboardingService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
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
    findActive() {
        return this.repo.find({
            where: { isActive: true },
            order: { sortOrder: 'ASC' },
        });
    }
    findAll() {
        return this.repo.find({ order: { sortOrder: 'ASC' } });
    }
    async create(dto) {
        const slide = this.repo.create(dto);
        return this.repo.save(slide);
    }
    async update(id, dto) {
        await this.repo.update(id, dto);
        const slide = await this.repo.findOneBy({ id });
        if (!slide)
            throw new common_1.NotFoundException('Slide bulunamadı');
        return slide;
    }
    async remove(id) {
        const slide = await this.repo.findOneBy({ id });
        if (!slide)
            throw new common_1.NotFoundException('Slide bulunamadı');
        await this.repo.remove(slide);
    }
    async reorder(ids) {
        await Promise.all(ids.map((id, index) => this.repo.update(id, { sortOrder: index })));
    }
};
exports.OnboardingService = OnboardingService;
exports.OnboardingService = OnboardingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(onboarding_slide_entity_1.OnboardingSlide)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], OnboardingService);
//# sourceMappingURL=onboarding.service.js.map