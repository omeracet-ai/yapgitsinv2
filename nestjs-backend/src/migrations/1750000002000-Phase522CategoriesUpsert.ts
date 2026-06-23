import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 522 — Categories canonical upsert + Klima Servis cleanup.
 *
 * Sorun: prod canlısında `GET /categories` → 16 satır dönüyor (CLAUDE.md
 * kanonik liste 29 olmalı). Eksikler:
 *   - Yapı & Tesisat: Marangoz & Ahşap, Cam & Doğrama, Güvenlik Sistemleri
 *   - Dijital & Teknik grubu tamamen yok (4 kategori)
 *   - Etkinlik & Yaşam grubu tamamen yok (4 kategori)
 *   - `Klima Servis` (NULL group) duplicate var — silinmeli, FK'leri
 *     `Klima & Isıtma`'ya migrate edilmeli.
 *
 * Eski `CategoriesService.onModuleInit()` yalnızca tablo boşken seed ediyordu;
 * admin tarafından silinen veya hiç eklenmemiş kayıtlar bir daha gelmiyordu.
 *
 * Bu migration:
 *   1. `Klima Servis` varsa → Job + ServiceRequest FK'lerini
 *      `Klima & Isıtma`'ya migrate eder, sonra `Klima Servis` row'unu siler.
 *      `Klima & Isıtma` yoksa, önce onu canonical listeden insert eder.
 *   2. 29 kanonik kategoriyi `name` üzerinden UPSERT eder (INSERT OR IGNORE
 *      pattern + null/empty group/icon backfill UPDATE).
 *   3. CategoriesService.onModuleInit içindeki idempotent hook ek güvence;
 *      bu migration hızlı recovery için.
 *
 * Idempotent — tekrar koşulduğunda no-op.
 */
type CanonicalCategory = {
  name: string;
  icon: string;
  group: string;
  sortOrder: number;
  description: string;
};

const CANONICAL: CanonicalCategory[] = [
  // Ev & Yaşam (8)
  { name: 'Temizlik', icon: '🧹', group: 'Ev & Yaşam', sortOrder: 101, description: 'Ev, ofis temizliği, derin temizlik, halı yıkama' },
  { name: 'Boya & Badana', icon: '🖌️', group: 'Ev & Yaşam', sortOrder: 102, description: 'İç/dış cephe boya, dekoratif boya, alçı-sıva' },
  { name: 'Bahçe & Peyzaj', icon: '🌿', group: 'Ev & Yaşam', sortOrder: 103, description: 'Bahçe bakımı, çim biçme, peyzaj tasarımı' },
  { name: 'Nakliyat', icon: '🚚', group: 'Ev & Yaşam', sortOrder: 104, description: 'Ev, ofis ve parça taşıma, asansörlü nakliye' },
  { name: 'Mobilya Montaj', icon: '🪑', group: 'Ev & Yaşam', sortOrder: 105, description: 'IKEA montaj, dolap, kitaplık, raf kurulumu' },
  { name: 'Haşere Kontrolü', icon: '🐛', group: 'Ev & Yaşam', sortOrder: 106, description: 'Böcek, fare, güve ilaçlama ve dezenfeksiyon' },
  { name: 'Havuz & Spa', icon: '🏊', group: 'Ev & Yaşam', sortOrder: 107, description: 'Havuz bakım, temizleme, ekipman onarımı' },
  { name: 'Çilingir & Kilit', icon: '🔐', group: 'Ev & Yaşam', sortOrder: 108, description: 'Kilit açma, kilit değiştirme, kasa montajı' },
  // Yapı & Tesisat (9)
  { name: 'Elektrikçi', icon: '⚡', group: 'Yapı & Tesisat', sortOrder: 201, description: 'Elektrik arıza, tesisat, priz/aydınlatma montajı' },
  { name: 'Tesisat', icon: '🔧', group: 'Yapı & Tesisat', sortOrder: 202, description: 'Su tesisatı, tıkanıklık açma, kaçak giderme' },
  { name: 'Klima & Isıtma', icon: '❄️', group: 'Yapı & Tesisat', sortOrder: 203, description: 'Klima montaj, bakım, gaz dolumu, ısıtma sistemleri' },
  { name: 'Zemin & Parke', icon: '🪵', group: 'Yapı & Tesisat', sortOrder: 204, description: 'Laminat, parke, seramik döşeme ve tamirat' },
  { name: 'Çatı & Yalıtım', icon: '🏠', group: 'Yapı & Tesisat', sortOrder: 205, description: 'Çatı onarım, su yalıtımı, ısı yalıtımı' },
  { name: 'Marangoz & Ahşap', icon: '🪚', group: 'Yapı & Tesisat', sortOrder: 206, description: 'Kapı, pencere, ahşap imalat ve montaj' },
  { name: 'Cam & Doğrama', icon: '🪟', group: 'Yapı & Tesisat', sortOrder: 207, description: 'PVC/alüminyum doğrama, cam balkon, sineklik' },
  { name: 'Alçıpan & Asma Tavan', icon: '🔨', group: 'Yapı & Tesisat', sortOrder: 208, description: 'Alçıpan bölme, asma tavan, dekoratif alçı' },
  { name: 'Güvenlik Sistemleri', icon: '📹', group: 'Yapı & Tesisat', sortOrder: 209, description: 'Kamera, alarm, parmak izi ve akıllı kilit' },
  // Dijital & Teknik (4)
  { name: 'Bilgisayar & IT', icon: '💻', group: 'Dijital & Teknik', sortOrder: 301, description: 'Teknik destek, format, ağ kurulumu, veri kurtarma' },
  { name: 'Grafik & Tasarım', icon: '🎨', group: 'Dijital & Teknik', sortOrder: 302, description: 'Logo, kurumsal kimlik, sosyal medya, baskı tasarımı' },
  { name: 'Web & Yazılım', icon: '🌐', group: 'Dijital & Teknik', sortOrder: 303, description: 'Web sitesi, e-ticaret, mobil uygulama geliştirme' },
  { name: 'Fotoğraf & Video', icon: '📸', group: 'Dijital & Teknik', sortOrder: 304, description: 'Ürün, etkinlik, drone fotoğraf ve video çekimi' },
  // Etkinlik & Yaşam (4)
  { name: 'Düğün & Organizasyon', icon: '💐', group: 'Etkinlik & Yaşam', sortOrder: 401, description: 'Düğün, nişan, doğum günü, kurumsal etkinlik organizasyonu' },
  { name: 'Özel Ders & Eğitim', icon: '📚', group: 'Etkinlik & Yaşam', sortOrder: 402, description: 'Matematik, dil, müzik, spor özel ders ve koçluk' },
  { name: 'Sağlık & Güzellik', icon: '💆', group: 'Etkinlik & Yaşam', sortOrder: 403, description: 'Masaj, kuaför, manikür, beslenme danışmanlığı' },
  { name: 'Evcil Hayvan', icon: '🐾', group: 'Etkinlik & Yaşam', sortOrder: 404, description: 'Köpek eğitimi, bakıcılık, tıraş, veteriner yönlendirme' },
  // Araç & Taşıt (1)
  { name: 'Araç & Oto Bakım', icon: '🚗', group: 'Araç & Taşıt', sortOrder: 501, description: 'Araç yıkama, detay temizlik, lastik, küçük tamirat' },
];

export class Phase522CategoriesUpsert1750000002000
  implements MigrationInterface
{
  name = 'Phase522CategoriesUpsert1750000002000';

  public async up(qr: QueryRunner): Promise<void> {
    // 0. Tablonun varlığını doğrula (yeni env'de schema henüz oluşmamış olabilir).
    const tableExists: Array<{ name: string }> = await qr.query(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='categories'`,
    );
    if (!tableExists.length) return;

    // 1. CANONICAL upsert — name UNIQUE constraint var, INSERT OR IGNORE güvenli.
    for (const cat of CANONICAL) {
      // INSERT OR IGNORE → yoksa ekler, varsa atlar.
      // id için lowercase hex uuid v4 üretmek için randomblob+hex tekniği
      // (SQLite native uuid yok ama TypeORM uuid kolonu varchar(36)).
      await qr.query(
        `INSERT OR IGNORE INTO categories
           (id, name, icon, "group", sortOrder, description, isActive, createdAt, updatedAt)
         VALUES
           (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
            substr(lower(hex(randomblob(2))),2) || '-' ||
            substr('89ab',abs(random()) % 4 + 1, 1) ||
            substr(lower(hex(randomblob(2))),2) || '-' ||
            lower(hex(randomblob(6))),
            ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
        [cat.name, cat.icon, cat.group, cat.sortOrder, cat.description],
      );

      // Backfill — group/icon/sortOrder boşsa kanonikten doldur.
      await qr.query(
        `UPDATE categories
           SET "group" = COALESCE(NULLIF("group", ''), ?),
               icon = COALESCE(NULLIF(icon, ''), ?),
               sortOrder = CASE WHEN sortOrder IS NULL OR sortOrder = 0 THEN ? ELSE sortOrder END,
               updatedAt = datetime('now')
         WHERE name = ?`,
        [cat.group, cat.icon, cat.sortOrder, cat.name],
      );
    }

    // 2. Klima Servis cleanup — duplicate + NULL group artığı.
    const klimaServisRows: Array<{ id: string }> = await qr.query(
      `SELECT id FROM categories WHERE name = 'Klima Servis'`,
    );
    if (klimaServisRows.length) {
      const klimaServisId = klimaServisRows[0].id;
      const klimaIsitmaRows: Array<{ id: string; name: string }> = await qr.query(
        `SELECT id, name FROM categories WHERE name = 'Klima & Isıtma'`,
      );
      if (klimaIsitmaRows.length) {
        const klimaIsitma = klimaIsitmaRows[0];

        // Job FK migrate (categoryId + denormalize category text).
        const jobsTable: Array<{ name: string }> = await qr.query(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='jobs'`,
        );
        if (jobsTable.length) {
          await qr.query(
            `UPDATE jobs SET categoryId = ?, category = ? WHERE categoryId = ?`,
            [klimaIsitma.id, klimaIsitma.name, klimaServisId],
          );
        }

        // ServiceRequest FK migrate.
        const srTable: Array<{ name: string }> = await qr.query(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='service_requests'`,
        );
        if (srTable.length) {
          await qr.query(
            `UPDATE service_requests SET categoryId = ?, category = ? WHERE categoryId = ?`,
            [klimaIsitma.id, klimaIsitma.name, klimaServisId],
          );
        }

        // Sil.
        await qr.query(`DELETE FROM categories WHERE id = ?`, [klimaServisId]);
      }
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    // No-op: tek yönlü kanonik düzeltme. Geri alma manuel admin işidir.
    void qr;
  }
}
