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
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const category_entity_1 = require("./category.entity");
const SEED_CATEGORIES = [
    {
        name: 'Temizlik',
        icon: '🧹',
        group: 'Ev & Yaşam',
        sortOrder: 101,
        description: 'Ev, ofis temizliği, derin temizlik, halı yıkama',
    },
    {
        name: 'Boya & Badana',
        icon: '🖌️',
        group: 'Ev & Yaşam',
        sortOrder: 102,
        description: 'İç/dış cephe boya, dekoratif boya, alçı-sıva',
    },
    {
        name: 'Bahçe & Peyzaj',
        icon: '🌿',
        group: 'Ev & Yaşam',
        sortOrder: 103,
        description: 'Bahçe bakımı, çim biçme, peyzaj tasarımı',
    },
    {
        name: 'Nakliyat',
        icon: '🚚',
        group: 'Ev & Yaşam',
        sortOrder: 104,
        description: 'Ev, ofis ve parça taşıma, asansörlü nakliye',
    },
    {
        name: 'Mobilya Montaj',
        icon: '🪑',
        group: 'Ev & Yaşam',
        sortOrder: 105,
        description: 'IKEA montaj, dolap, kitaplık, raf kurulumu',
    },
    {
        name: 'Haşere Kontrolü',
        icon: '🐛',
        group: 'Ev & Yaşam',
        sortOrder: 106,
        description: 'Böcek, fare, güve ilaçlama ve dezenfeksiyon',
    },
    {
        name: 'Havuz & Spa',
        icon: '🏊',
        group: 'Ev & Yaşam',
        sortOrder: 107,
        description: 'Havuz bakım, temizleme, ekipman onarımı',
    },
    {
        name: 'Çilingir & Kilit',
        icon: '🔐',
        group: 'Ev & Yaşam',
        sortOrder: 108,
        description: 'Kilit açma, kilit değiştirme, kasa montajı',
    },
    {
        name: 'Elektrikçi',
        icon: '⚡',
        group: 'Yapı & Tesisat',
        sortOrder: 201,
        description: 'Elektrik arıza, tesisat, priz/aydınlatma montajı',
    },
    {
        name: 'Tesisat',
        icon: '🔧',
        group: 'Yapı & Tesisat',
        sortOrder: 202,
        description: 'Su tesisatı, tıkanıklık açma, kaçak giderme',
    },
    {
        name: 'Klima & Isıtma',
        icon: '❄️',
        group: 'Yapı & Tesisat',
        sortOrder: 203,
        description: 'Klima montaj, bakım, gaz dolumu, ısıtma sistemleri',
    },
    {
        name: 'Zemin & Parke',
        icon: '🪵',
        group: 'Yapı & Tesisat',
        sortOrder: 204,
        description: 'Laminat, parke, seramik döşeme ve tamirat',
    },
    {
        name: 'Çatı & Yalıtım',
        icon: '🏠',
        group: 'Yapı & Tesisat',
        sortOrder: 205,
        description: 'Çatı onarım, su yalıtımı, ısı yalıtımı',
    },
    {
        name: 'Marangoz & Ahşap',
        icon: '🪚',
        group: 'Yapı & Tesisat',
        sortOrder: 206,
        description: 'Kapı, pencere, ahşap imalat ve montaj',
    },
    {
        name: 'Cam & Doğrama',
        icon: '🪟',
        group: 'Yapı & Tesisat',
        sortOrder: 207,
        description: 'PVC/alüminyum doğrama, cam balkon, sineklik',
    },
    {
        name: 'Alçıpan & Asma Tavan',
        icon: '🔨',
        group: 'Yapı & Tesisat',
        sortOrder: 208,
        description: 'Alçıpan bölme, asma tavan, dekoratif alçı',
    },
    {
        name: 'Güvenlik Sistemleri',
        icon: '📹',
        group: 'Yapı & Tesisat',
        sortOrder: 209,
        description: 'Kamera, alarm, parmak izi ve akıllı kilit',
    },
    {
        name: 'Bilgisayar & IT',
        icon: '💻',
        group: 'Dijital & Teknik',
        sortOrder: 301,
        description: 'Teknik destek, format, ağ kurulumu, veri kurtarma',
    },
    {
        name: 'Grafik & Tasarım',
        icon: '🎨',
        group: 'Dijital & Teknik',
        sortOrder: 302,
        description: 'Logo, kurumsal kimlik, sosyal medya, baskı tasarımı',
    },
    {
        name: 'Web & Yazılım',
        icon: '🌐',
        group: 'Dijital & Teknik',
        sortOrder: 303,
        description: 'Web sitesi, e-ticaret, mobil uygulama geliştirme',
    },
    {
        name: 'Fotoğraf & Video',
        icon: '📸',
        group: 'Dijital & Teknik',
        sortOrder: 304,
        description: 'Ürün, etkinlik, drone fotoğraf ve video çekimi',
    },
    {
        name: 'Düğün & Organizasyon',
        icon: '💐',
        group: 'Etkinlik & Yaşam',
        sortOrder: 401,
        description: 'Düğün, nişan, doğum günü, kurumsal etkinlik organizasyonu',
    },
    {
        name: 'Özel Ders & Eğitim',
        icon: '📚',
        group: 'Etkinlik & Yaşam',
        sortOrder: 402,
        description: 'Matematik, dil, müzik, spor özel ders ve koçluk',
    },
    {
        name: 'Sağlık & Güzellik',
        icon: '💆',
        group: 'Etkinlik & Yaşam',
        sortOrder: 403,
        description: 'Masaj, kuaför, manikür, beslenme danışmanlığı',
    },
    {
        name: 'Evcil Hayvan',
        icon: '🐾',
        group: 'Etkinlik & Yaşam',
        sortOrder: 404,
        description: 'Köpek eğitimi, bakıcılık, tıraş, veteriner yönlendirme',
    },
    {
        name: 'Araç & Oto Bakım',
        icon: '🚗',
        group: 'Araç & Taşıt',
        sortOrder: 501,
        description: 'Araç yıkama, detay temizlik, lastik, küçük tamirat',
    },
];
let CategoriesService = class CategoriesService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async onModuleInit() {
        const count = await this.repo.count();
        if (count === 0) {
            await this.repo.save(SEED_CATEGORIES.map((c) => this.repo.create({ ...c, isActive: true })));
        }
    }
    findAll() {
        return this.repo.find({
            where: { isActive: true },
            order: { sortOrder: 'ASC', createdAt: 'ASC' },
        });
    }
    findAllIncludingInactive() {
        return this.repo.find({
            order: { sortOrder: 'ASC', createdAt: 'ASC' },
        });
    }
    async findOne(id) {
        const cat = await this.repo.findOne({ where: { id } });
        if (!cat)
            throw new common_1.NotFoundException(`Kategori bulunamadı: ${id}`);
        return cat;
    }
    create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async update(id, data) {
        const cat = await this.findOne(id);
        Object.assign(cat, data);
        return this.repo.save(cat);
    }
    async remove(id) {
        const cat = await this.findOne(id);
        await this.repo.remove(cat);
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(category_entity_1.Category)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map