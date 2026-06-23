import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { Job } from '../jobs/job.entity';
import { ServiceRequest } from '../service-requests/service-request.entity';

/** Airtasker / HiPages ilham alınarak hazırlanan Türkçe kategori listesi */
const SEED_CATEGORIES = [
  // Ev & Yaşam
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
  // Yapı & Tesisat
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
  // Dijital & Teknik
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
  // Etkinlik & Yaşam
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
  // Araç & Taşıt
  {
    name: 'Araç & Oto Bakım',
    icon: '🚗',
    group: 'Araç & Taşıt',
    sortOrder: 501,
    description: 'Araç yıkama, detay temizlik, lastik, küçük tamirat',
  },
];

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectRepository(Category)
    private repo: Repository<Category>,
    @InjectRepository(Job)
    private jobsRepo: Repository<Job>,
    @InjectRepository(ServiceRequest)
    private srRepo: Repository<ServiceRequest>,
  ) {}

  /**
   * Phase 522 — Idempotent canonical upsert.
   *
   * Önceki davranış: tablo boşsa seed et. Üretimde admin tarafından silinen
   * kategoriler bir daha eklenmiyordu → CLAUDE.md'deki 29 kanonik liste 16'ya
   * düşmüştü. Yeni davranış:
   *   1. Her boot'ta CANONICAL_CATEGORIES üzerinden yürü.
   *   2. Yoksa CREATE (isActive=true).
   *   3. Varsa: group/icon/sortOrder eksik veya null ise backfill (override),
   *      diğer kullanıcı düzenlemeleri (description, isActive=false vs.) korunur.
   *   4. `Klima Servis` (NULL group, eski seed artığı) varsa Job + ServiceRequest
   *      FK'leri `Klima & Isıtma`'ya migrate edilir, sonra silinir.
   *
   * Migration `1750000002000-Phase522CategoriesUpsert` boot öncesi DB seviyesinde
   * aynı işi yapar (idempotent + yeni env'lerde de güvenli). Bu hook ek bir
   * güvence katmanıdır.
   */
  async onModuleInit() {
    try {
      await this.cleanupKlimaServis();
    } catch (e) {
      this.logger.error(
        `[phase-522b] cleanupKlimaServis failed: ${(e as Error).message}`,
      );
    }
    try {
      await this.upsertCanonical();
    } catch (e) {
      this.logger.error(
        `[phase-522b] upsertCanonical failed: ${(e as Error).message}`,
      );
    }
    // Final tally — production canlı tanılama
    const total = await this.repo.count();
    const active = await this.repo.count({ where: { isActive: true } });
    this.logger.log(
      `[phase-522b] categories tally → total=${total} active=${active}`,
    );
  }

  /**
   * Phase 522b — Per-row try/catch + individual error logging.
   * Phase 522'de save() çalışmadı (prod hâlâ 15/29) — muhtemel sebep:
   * tek bir kategoride simple-json default null çakışması veya unique violation.
   * Per-row hata yutulursa diğer kategoriler yine create edilir.
   */
  private async upsertCanonical(): Promise<void> {
    let created = 0;
    let backfilled = 0;
    let failed = 0;
    for (const cat of SEED_CATEGORIES) {
      try {
        const existing = await this.repo.findOne({ where: { name: cat.name } });
        if (!existing) {
          // Repo.save yerine doğrudan create + save — açıkça hata göster.
          const entity = this.repo.create({
            name: cat.name,
            icon: cat.icon,
            description: cat.description,
            group: cat.group,
            sortOrder: cat.sortOrder,
            isActive: true,
            subServices: null,
            avgPriceMin: null,
            avgPriceMax: null,
          });
          await this.repo.save(entity);
          created++;
          continue;
        }
        const patch: Partial<Category> = {};
        if (!existing.group) patch.group = cat.group;
        if (!existing.icon) patch.icon = cat.icon;
        if (existing.sortOrder == null || existing.sortOrder === 0) {
          patch.sortOrder = cat.sortOrder;
        }
        // Phase 522b — kanonik liste daima aktif olmalı.
        // 3 grup (Dijital/Etkinlik + 3 Yapı kategorisi) admin tarafından
        // toplu `isActive=false` yapılmış → prod canlısında "Total: 26, Active: 15"
        // olarak ortaya çıktı. Kanonik kategorilerin admin tarafından soft-delete
        // edilmesini değil, hard-delete edilmesini bekliyoruz (sonra yine geri eklenebilir).
        if (existing.isActive === false) {
          patch.isActive = true;
        }
        if (Object.keys(patch).length > 0) {
          await this.repo.update(existing.id, patch);
          backfilled++;
        }
      } catch (e) {
        failed++;
        this.logger.error(
          `[phase-522b] failed to upsert "${cat.name}": ${(e as Error).message}`,
        );
      }
    }
    this.logger.log(
      `[phase-522b] categories upsert: created=${created} backfilled=${backfilled} failed=${failed}`,
    );
  }

  private async cleanupKlimaServis(): Promise<void> {
    const klimaServis = await this.repo.findOne({
      where: { name: 'Klima Servis' },
    });
    if (!klimaServis) return;

    const klimaIsitma = await this.repo.findOne({
      where: { name: 'Klima & Isıtma' },
    });
    if (!klimaIsitma) {
      // Hedef yoksa silme — önce upsert lazım. Bir sonraki boot'ta tekrar dene.
      this.logger.warn(
        '[phase-522] Klima Servis var ama Klima & Isıtma yok — cleanup atlandı.',
      );
      return;
    }

    const jobsMigrated = await this.jobsRepo.update(
      { categoryId: klimaServis.id },
      { categoryId: klimaIsitma.id, category: klimaIsitma.name },
    );
    const srMigrated = await this.srRepo.update(
      { categoryId: klimaServis.id },
      { categoryId: klimaIsitma.id, category: klimaIsitma.name },
    );
    await this.repo.delete(klimaServis.id);

    this.logger.log(
      `[phase-522] Klima Servis temizlendi → jobs=${jobsMigrated.affected ?? 0} sr=${srMigrated.affected ?? 0}`,
    );
  }

  findAll(): Promise<Category[]> {
    return this.repo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * Phase 238B — Kategori ağacı: group alanına göre 2 seviyeli hiyerarşi.
   * { group, children: Category[] }[]
   */
  async findTree(): Promise<{ group: string; children: Category[] }[]> {
    const cats = await this.findAll();
    const map = new Map<string, Category[]>();
    for (const c of cats) {
      const g = c.group ?? 'Diğer';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(c);
    }
    return Array.from(map.entries()).map(([group, children]) => ({
      group,
      children,
    }));
  }

  /** Admin: tüm kategoriler (aktif + pasif) */
  findAllIncludingInactive(): Promise<Category[]> {
    return this.repo.find({
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
