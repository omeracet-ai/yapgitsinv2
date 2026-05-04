/**
 * seed-categories-v3.js
 * Airtasker / HiPages ilham alınarak hazırlanmış
 * 26 Türkçe kategori + grup ilişkisi + alt hizmetler + fiyat aralığı.
 *
 * node seed-categories-v3.js
 */
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

const db = new sqlite3.Database('./hizmet_db.sqlite');

function run(sql, p = []) {
  return new Promise((res, rej) => db.run(sql, p, function (e) { e ? rej(e) : res(this); }));
}
function all(sql, p = []) {
  return new Promise((res, rej) => db.all(sql, p, (e, r) => e ? rej(e) : res(r)));
}

// ─── Kategori listesi ──────────────────────────────────────────────────────────
const categories = [

  // ── Ev & Yaşam ───────────────────────────────────────────────────────────────
  {
    name: 'Temizlik', icon: '🧹', group: 'Ev & Yaşam', sortOrder: 101,
    description: 'Ev, ofis ve işyeri temizliği, derin temizlik',
    subServices: ['Ev Temizliği', 'Ofis Temizliği', 'Derin Temizlik', 'Cam Silme', 'Halı Yıkama', 'Koltuk Yıkama'],
    avgPriceMin: 400, avgPriceMax: 1500,
  },
  {
    name: 'Boya & Badana', icon: '🖌️', group: 'Ev & Yaşam', sortOrder: 102,
    description: 'İç/dış cephe boya, dekoratif boya, alçı-sıva',
    subServices: ['İç Cephe Boya', 'Dış Cephe Boya', 'Dekoratif Boya', 'Alçı & Sıva', 'Duvar Kağıdı', 'Epoksi Zemin'],
    avgPriceMin: 800, avgPriceMax: 6000,
  },
  {
    name: 'Bahçe & Peyzaj', icon: '🌿', group: 'Ev & Yaşam', sortOrder: 103,
    description: 'Bahçe bakımı, çim biçme, peyzaj tasarımı, sulama sistemi',
    subServices: ['Çim Biçme', 'Budama & Kesim', 'Peyzaj Tasarımı', 'Sulama Sistemi', 'Çit Yapımı', 'Toprak İşleme'],
    avgPriceMin: 300, avgPriceMax: 4000,
  },
  {
    name: 'Nakliyat', icon: '🚚', group: 'Ev & Yaşam', sortOrder: 104,
    description: 'Ev, ofis ve parça taşıma, asansörlü nakliye',
    subServices: ['Ev Taşıma', 'Ofis Taşıma', 'Parça Eşya', 'Piyano Taşıma', 'Asansörlü Taşıma', 'Araç Kiralama'],
    avgPriceMin: 600, avgPriceMax: 8000,
  },
  {
    name: 'Mobilya Montaj', icon: '🪑', group: 'Ev & Yaşam', sortOrder: 105,
    description: 'IKEA montaj, dolap, kitaplık, raf ve mobilya kurulumu',
    subServices: ['IKEA Montaj', 'Dolap Montajı', 'Kitaplık & Raf', 'Bebek Odası', 'TV Ünitesi', 'Çekyat & Kanepe'],
    avgPriceMin: 200, avgPriceMax: 2000,
  },
  {
    name: 'Haşere Kontrolü', icon: '🐛', group: 'Ev & Yaşam', sortOrder: 106,
    description: 'Böcek, fare, güve ilaçlama ve dezenfeksiyon',
    subServices: ['Böcek İlaçlama', 'Fare Tuzağı', 'Güve Önleme', 'Termit Tedavisi', 'Dezenfeksiyon', 'Tahta Kurusu'],
    avgPriceMin: 300, avgPriceMax: 2500,
  },
  {
    name: 'Havuz & Spa', icon: '🏊', group: 'Ev & Yaşam', sortOrder: 107,
    description: 'Havuz bakım, temizleme, ekipman onarımı',
    subServices: ['Havuz Temizliği', 'Kimyasal Denge', 'Ekipman Onarımı', 'Havuz Yapımı', 'Jakuzi Bakımı', 'Filtre Değişimi'],
    avgPriceMin: 400, avgPriceMax: 5000,
  },
  {
    name: 'Çilingir & Kilit', icon: '🔐', group: 'Ev & Yaşam', sortOrder: 108,
    description: 'Kilit açma, kilit değiştirme, kasa montajı',
    subServices: ['Kapı Açma', 'Kilit Değişimi', 'Kasa Montajı', 'Güvenli Kapı', 'Araba Kilidi', 'Master Kilit'],
    avgPriceMin: 150, avgPriceMax: 1500,
  },

  // ── Yapı & Tesisat ───────────────────────────────────────────────────────────
  {
    name: 'Elektrikçi', icon: '⚡', group: 'Yapı & Tesisat', sortOrder: 201,
    description: 'Elektrik arıza, tesisat, priz/aydınlatma montajı',
    subServices: ['Arıza Tespiti', 'Priz & Anahtar', 'Aydınlatma', 'Sigorta Panosu', 'Kablo Çekimi', 'Akıllı Ev'],
    avgPriceMin: 250, avgPriceMax: 3000,
  },
  {
    name: 'Tesisat', icon: '🔧', group: 'Yapı & Tesisat', sortOrder: 202,
    description: 'Su tesisatı, tıkanıklık açma, kaçak giderme',
    subServices: ['Tıkanıklık Açma', 'Su Kaçağı', 'Banyo Yenileme', 'Musluk Değişimi', 'Kombi Servis', 'Pis Su Hattı'],
    avgPriceMin: 300, avgPriceMax: 4000,
  },
  {
    name: 'Klima & Isıtma', icon: '❄️', group: 'Yapı & Tesisat', sortOrder: 203,
    description: 'Klima montaj, bakım, gaz dolumu, ısıtma sistemleri',
    subServices: ['Klima Montajı', 'Bakım & Temizlik', 'Gaz Dolumu', 'Arıza Tespiti', 'Kombi Kurulumu', 'Yerden Isıtma'],
    avgPriceMin: 400, avgPriceMax: 3500,
  },
  {
    name: 'Zemin & Parke', icon: '🪵', group: 'Yapı & Tesisat', sortOrder: 204,
    description: 'Laminat, parke, seramik döşeme ve tamirat',
    subServices: ['Laminat Parke', 'Masif Parke', 'Seramik & Fayans', 'Mermer', 'Zemin Cilası', 'Levha Tamirat'],
    avgPriceMin: 500, avgPriceMax: 6000,
  },
  {
    name: 'Çatı & Yalıtım', icon: '🏠', group: 'Yapı & Tesisat', sortOrder: 205,
    description: 'Çatı onarım, su yalıtımı, ısı yalıtımı',
    subServices: ['Çatı Onarımı', 'Su Yalıtımı', 'Isı Yalıtımı', 'Kiremit Değişimi', 'Baca Onarımı', 'Oluk Temizliği'],
    avgPriceMin: 600, avgPriceMax: 8000,
  },
  {
    name: 'Marangoz & Ahşap', icon: '🪚', group: 'Yapı & Tesisat', sortOrder: 206,
    description: 'Kapı, pencere, ahşap imalat ve montaj',
    subServices: ['Kapı Yapımı', 'Mutfak Dolabı', 'Ahşap Dekor', 'Parke Tamirat', 'Pergola', 'Yenileme & Boyama'],
    avgPriceMin: 500, avgPriceMax: 7000,
  },
  {
    name: 'Cam & Doğrama', icon: '🪟', group: 'Yapı & Tesisat', sortOrder: 207,
    description: 'PVC/alüminyum doğrama, cam balkon, sineklik',
    subServices: ['PVC Pencere', 'Alüminyum Doğrama', 'Cam Balkon', 'Sineklik', 'Çift Cam', 'Cam Kırığı Onarım'],
    avgPriceMin: 400, avgPriceMax: 8000,
  },
  {
    name: 'Alçıpan & Asma Tavan', icon: '🔨', group: 'Yapı & Tesisat', sortOrder: 208,
    description: 'Alçıpan bölme, asma tavan, dekoratif alçı',
    subServices: ['Alçıpan Bölme', 'Asma Tavan', 'Kartonpiyer', 'Dekoratif Alçı', 'Ses Yalıtımı', 'Yangın Kapısı'],
    avgPriceMin: 400, avgPriceMax: 5000,
  },
  {
    name: 'Güvenlik Sistemleri', icon: '📹', group: 'Yapı & Tesisat', sortOrder: 209,
    description: 'Kamera, alarm, parmak izi ve akıllı kilit kurulumu',
    subServices: ['Güvenlik Kamerası', 'Hırsız Alarmı', 'Parmak İzi Sistemi', 'Akıllı Kilit', 'İnterkom', 'Yangın Alarmı'],
    avgPriceMin: 300, avgPriceMax: 5000,
  },

  // ── Dijital & Teknik ─────────────────────────────────────────────────────────
  {
    name: 'Bilgisayar & IT', icon: '💻', group: 'Dijital & Teknik', sortOrder: 301,
    description: 'Teknik destek, format, ağ kurulumu, veri kurtarma',
    subServices: ['Teknik Destek', 'Format & Kurulum', 'Ağ & Wi-Fi', 'Veri Kurtarma', 'Yazıcı Kurulum', 'Virüs Temizleme'],
    avgPriceMin: 150, avgPriceMax: 2000,
  },
  {
    name: 'Grafik & Tasarım', icon: '🎨', group: 'Dijital & Teknik', sortOrder: 302,
    description: 'Logo, kurumsal kimlik, sosyal medya, baskı tasarımı',
    subServices: ['Logo Tasarım', 'Kurumsal Kimlik', 'Sosyal Medya', 'Broşür & Afiş', 'Ambalaj Tasarımı', 'Animasyon'],
    avgPriceMin: 200, avgPriceMax: 5000,
  },
  {
    name: 'Web & Yazılım', icon: '🌐', group: 'Dijital & Teknik', sortOrder: 303,
    description: 'Web sitesi, e-ticaret, mobil uygulama geliştirme',
    subServices: ['Web Sitesi', 'E-Ticaret', 'Mobil Uygulama', 'SEO & Analitik', 'WordPress', 'API Entegrasyon'],
    avgPriceMin: 500, avgPriceMax: 15000,
  },
  {
    name: 'Fotoğraf & Video', icon: '📸', group: 'Dijital & Teknik', sortOrder: 304,
    description: 'Ürün, etkinlik, drone fotoğraf ve video çekimi',
    subServices: ['Ürün Fotoğrafı', 'Etkinlik Fotoğrafı', 'Drone Çekimi', 'Video Montaj', 'Reels & Kısa Film', 'Mimari Fotoğraf'],
    avgPriceMin: 300, avgPriceMax: 5000,
  },

  // ── Etkinlik & Yaşam ─────────────────────────────────────────────────────────
  {
    name: 'Düğün & Organizasyon', icon: '💐', group: 'Etkinlik & Yaşam', sortOrder: 401,
    description: 'Düğün, nişan, doğum günü, kurumsal etkinlik organizasyonu',
    subServices: ['Düğün Organizasyon', 'Nişan Töreni', 'Doğum Günü', 'Kurumsal Etkinlik', 'Çiçek Süsleme', 'DJ & Müzik'],
    avgPriceMin: 1000, avgPriceMax: 20000,
  },
  {
    name: 'Özel Ders & Eğitim', icon: '📚', group: 'Etkinlik & Yaşam', sortOrder: 402,
    description: 'Matematik, dil, müzik, spor özel ders ve koçluk',
    subServices: ['Matematik', 'Yabancı Dil', 'Müzik Aleti', 'Spor & Fitness', 'Sürücü Kursu', 'YKS & KPSS'],
    avgPriceMin: 100, avgPriceMax: 1000,
  },
  {
    name: 'Sağlık & Güzellik', icon: '💆', group: 'Etkinlik & Yaşam', sortOrder: 403,
    description: 'Masaj, kuaför, manikür, beslenme danışmanlığı',
    subServices: ['Masaj', 'Saç Bakımı', 'Manikür & Pedikür', 'Kaş & Kirpik', 'Beslenme Koçu', 'Kişisel Antrenör'],
    avgPriceMin: 150, avgPriceMax: 2000,
  },
  {
    name: 'Evcil Hayvan', icon: '🐾', group: 'Etkinlik & Yaşam', sortOrder: 404,
    description: 'Köpek eğitimi, bakıcılık, tıraş, veteriner yönlendirme',
    subServices: ['Köpek Eğitimi', 'Evcil Bakıcı', 'Pet Tıraş', 'Veteriner Eşlik', 'Köpek Yürüyüşü', 'Otel & Pansiyon'],
    avgPriceMin: 100, avgPriceMax: 1500,
  },

  // ── Araç & Taşıt ─────────────────────────────────────────────────────────────
  {
    name: 'Araç & Oto Bakım', icon: '🚗', group: 'Araç & Taşıt', sortOrder: 501,
    description: 'Araç yıkama, detay temizlik, lastik, küçük tamirat',
    subServices: ['Araç Yıkama', 'Detay Temizlik', 'Lastik Değişimi', 'Yağ Değişimi', 'Kaporta Boya', 'Cam Film'],
    avgPriceMin: 150, avgPriceMax: 5000,
  },
];

// ─── Grup rengi / meta tablosu ────────────────────────────────────────────────
const GROUP_META = {
  'Ev & Yaşam':        { icon: '🏡', sortBase: 100 },
  'Yapı & Tesisat':    { icon: '🔩', sortBase: 200 },
  'Dijital & Teknik':  { icon: '💡', sortBase: 300 },
  'Etkinlik & Yaşam':  { icon: '🎉', sortBase: 400 },
  'Araç & Taşıt':      { icon: '🚗', sortBase: 500 },
};

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱 seed-categories-v3 başlıyor...\n');

  // "group" kolonu yoksa ekle (TypeORM synchronize olmadan elle)
  const cols = await all(`PRAGMA table_info(categories)`);
  const colNames = cols.map(c => c.name);
  if (!colNames.includes('group')) {
    await run(`ALTER TABLE categories ADD COLUMN "group" VARCHAR(60)`);
    console.log('  ➕  "group" kolonu eklendi\n');
  }

  let added = 0, updated = 0;

  for (const cat of categories) {
    const existing = await all('SELECT id FROM categories WHERE name = ?', [cat.name]);

    const subJson = JSON.stringify(cat.subServices);
    if (existing.length > 0) {
      await run(
        `UPDATE categories SET icon=?, description=?, "group"=?, subServices=?,
         avgPriceMin=?, avgPriceMax=?, sortOrder=?, isActive=1, updatedAt=datetime('now')
         WHERE name=?`,
        [cat.icon, cat.description, cat.group, subJson,
         cat.avgPriceMin, cat.avgPriceMax, cat.sortOrder, cat.name],
      );
      console.log(`  ✏️  Güncellendi : ${cat.icon} ${cat.name}  [${cat.group}]`);
      updated++;
    } else {
      await run(
        `INSERT INTO categories
           (id, name, icon, description, "group", subServices, avgPriceMin, avgPriceMax,
            sortOrder, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
        [uuidv4(), cat.name, cat.icon, cat.description, cat.group, subJson,
         cat.avgPriceMin, cat.avgPriceMax, cat.sortOrder],
      );
      console.log(`  ➕  Eklendi     : ${cat.icon} ${cat.name}  [${cat.group}]`);
      added++;
    }
  }

  // ── Özet ──
  console.log(`\n📊 Sonuç: ${added} yeni eklendi, ${updated} güncellendi`);

  const all_cats = await all(
    `SELECT "group", name, icon, avgPriceMin, avgPriceMax FROM categories WHERE isActive=1 ORDER BY sortOrder`
  );

  let currentGroup = '';
  console.log('\n📋 Tüm Kategoriler:\n');
  for (const c of all_cats) {
    const grp = c.group || '(Grupsuz)';
    if (grp !== currentGroup) {
      const meta = GROUP_META[grp] || {};
      console.log(`  ${meta.icon || '📁'} ${grp}`);
      currentGroup = grp;
    }
    console.log(`     ${c.icon} ${c.name}  (${c.avgPriceMin ?? '?'} – ${c.avgPriceMax ?? '?'} ₺)`);
  }

  console.log('\n✅ seed-categories-v3 tamamlandı!\n');
}

main()
  .catch(e => { console.error('HATA:', e.message); process.exit(1); })
  .finally(() => db.close());
