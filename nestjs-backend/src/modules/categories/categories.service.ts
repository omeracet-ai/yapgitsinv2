import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';

/** Airtasker / HiPages ilham alınarak hazırlanan Türkçe kategori listesi */
const SEED_CATEGORIES = [
  // Ev & Yaşam
  { name: 'Temizlik',          icon: '🧹', group: 'Ev & Yaşam',       sortOrder: 101, description: 'Ev, ofis temizliği, derin temizlik, halı yıkama' },
  { name: 'Boya & Badana',     icon: '🖌️', group: 'Ev & Yaşam',       sortOrder: 102, description: 'İç/dış cephe boya, dekoratif boya, alçı-sıva' },
  { name: 'Bahçe & Peyzaj',    icon: '🌿', group: 'Ev & Yaşam',       sortOrder: 103, description: 'Bahçe bakımı, çim biçme, peyzaj tasarımı' },
  { name: 'Nakliyat',          icon: '🚚', group: 'Ev & Yaşam',       sortOrder: 104, description: 'Ev, ofis ve parça taşıma, asansörlü nakliye' },
  { name: 'Mobilya Montaj',    icon: '🪑', group: 'Ev & Yaşam',       sortOrder: 105, description: 'IKEA montaj, dolap, kitaplık, raf kurulumu' },
  { name: 'Haşere Kontrolü',   icon: '🐛', group: 'Ev & Yaşam',       sortOrder: 106, description: 'Böcek, fare, güve ilaçlama ve dezenfeksiyon' },
  { name: 'Havuz & Spa',       icon: '🏊', group: 'Ev & Yaşam',       sortOrder: 107, description: 'Havuz bakım, temizleme, ekipman onarımı' },
  { name: 'Çilingir & Kilit',  icon: '🔐', group: 'Ev & Yaşam',       sortOrder: 108, description: 'Kilit açma, kilit değiştirme, kasa montajı' },
  // Yapı & Tesisat
  { name: 'Elektrikçi',        icon: '⚡', group: 'Yapı & Tesisat',   sortOrder: 201, description: 'Elektrik arıza, tesisat, priz/aydınlatma montajı' },
  { name: 'Tesisat',           icon: '🔧', group: 'Yapı & Tesisat',   sortOrder: 202, description: 'Su tesisatı, tıkanıklık açma, kaçak giderme' },
  { name: 'Klima & Isıtma',    icon: '❄️', group: 'Yapı & Tesisat',   sortOrder: 203, description: 'Klima montaj, bakım, gaz dolumu, ısıtma sistemleri' },
  { name: 'Zemin & Parke',     icon: '🪵', group: 'Yapı & Tesisat',   sortOrder: 204, description: 'Laminat, parke, seramik döşeme ve tamirat' },
  { name: 'Çatı & Yalıtım',   icon: '🏠', group: 'Yapı & Tesisat',   sortOrder: 205, description: 'Çatı onarım, su yalıtımı, ısı yalıtımı' },
  { name: 'Marangoz & Ahşap',  icon: '🪚', group: 'Yapı & Tesisat',   sortOrder: 206, description: 'Kapı, pencere, ahşap imalat ve montaj' },
  { name: 'Cam & Doğrama',     icon: '🪟', group: 'Yapı & Tesisat',   sortOrder: 207, description: 'PVC/alüminyum doğrama, cam balkon, sineklik' },
  { name: 'Alçıpan & Asma Tavan', icon: '🔨', group: 'Yapı & Tesisat', sortOrder: 208, description: 'Alçıpan bölme, asma tavan, dekoratif alçı' },
  { name: 'Güvenlik Sistemleri', icon: '📹', group: 'Yapı & Tesisat', sortOrder: 209, description: 'Kamera, alarm, parmak izi ve akıllı kilit' },
  // Dijital & Teknik
  { name: 'Bilgisayar & IT',   icon: '💻', group: 'Dijital & Teknik', sortOrder: 301, description: 'Teknik destek, format, ağ kurulumu, veri kurtarma' },
  { name: 'Grafik & Tasarım',  icon: '🎨', group: 'Dijital & Teknik', sortOrder: 302, description: 'Logo, kurumsal kimlik, sosyal medya, baskı tasarımı' },
  { name: 'Web & Yazılım',     icon: '🌐', group: 'Dijital & Teknik', sortOrder: 303, description: 'Web sitesi, e-ticaret, mobil uygulama geliştirme' },
  { name: 'Fotoğraf & Video',  icon: '📸', group: 'Dijital & Teknik', sortOrder: 304, description: 'Ürün, etkinlik, drone fotoğraf ve video çekimi' },
  // Etkinlik & Yaşam
  { name: 'Düğün & Organizasyon', icon: '💐', group: 'Etkinlik & Yaşam', sortOrder: 401, description: 'Düğün, nişan, doğum günü, kurumsal etkinlik organizasyonu' },
  { name: 'Özel Ders & Eğitim', icon: '📚', group: 'Etkinlik & Yaşam', sortOrder: 402, description: 'Matematik, dil, müzik, spor özel ders ve koçluk' },
  { name: 'Sağlık & Güzellik', icon: '💆', group: 'Etkinlik & Yaşam', sortOrder: 403, description: 'Masaj, kuaför, manikür, beslenme danışmanlığı' },
  { name: 'Evcil Hayvan',      icon: '🐾', group: 'Etkinlik & Yaşam', sortOrder: 404, description: 'Köpek eğitimi, bakıcılık, tıraş, veteriner yönlendirme' },
  // Araç & Taşıt
  { name: 'Araç & Oto Bakım',  icon: '🚗', group: 'Araç & Taşıt',    sortOrder: 501, description: 'Araç yıkama, detay temizlik, lastik, küçük tamirat' },
];

@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(
    @InjectRepository(Category)
    private repo: Repository<Category>,
  ) {}

  async onModuleInit() {
    const count = await this.repo.count();
    if (count === 0) {
      await this.repo.save(
        SEED_CATEGORIES.map(c => this.repo.create({ ...c, isActive: true })),
      );
    }
  }

  findAll(): Promise<Category[]> {
    return this.repo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Category> {
    const cat = await this.repo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException(`Kategori bulunamadı: ${id}`);
    return cat;
  }

  create(data: Partial<Category>): Promise<Category> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<Category>): Promise<Category> {
    const cat = await this.findOne(id);
    Object.assign(cat, data);
    return this.repo.save(cat);
  }

  async remove(id: string): Promise<void> {
    const cat = await this.findOne(id);
    await this.repo.remove(cat);
  }
}
