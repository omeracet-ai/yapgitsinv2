/**
 * seed-categories-v2.js
 * Kategorileri alt hizmetler + fiyat aralıklarıyla günceller.
 * Worker profillerini (Emre, Selin) ayarlar.
 * node seed-categories-v2.js
 */
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./hizmet_db.sqlite');

const EMRE  = '2342f480-63e8-496b-b827-a1b8ce93fa14';
const SELIN = 'ce0c0263-1598-4199-a04b-f94402238273';

function run(sql, p) {
  return new Promise((res, rej) => db.run(sql, p || [], function(e){ e ? rej(e) : res(this); }));
}
function all(sql, p) {
  return new Promise((res, rej) => db.all(sql, p || [], (e, r) => e ? rej(e) : res(r)));
}

const categories = [
  {
    name: 'Temizlik', icon: '🧹', sortOrder: 1,
    description: 'Ev, ofis ve işyeri temizliği',
    subServices: JSON.stringify(['Ev Temizliği', 'Ofis Temizliği', 'Derin Temizlik', 'Cam Silme', 'Halı Yıkama']),
    avgPriceMin: 400, avgPriceMax: 1200,
  },
  {
    name: 'Boya & Badana', icon: '🖌️', sortOrder: 2,
    description: 'İç ve dış cephe boya, dekoratif boya',
    subServices: JSON.stringify(['İç Cephe Boya', 'Dış Cephe Boya', 'Dekoratif Boya', 'Alçı & Sıva', 'Duvar Kağıdı']),
    avgPriceMin: 800, avgPriceMax: 5000,
  },
  {
    name: 'Nakliyat', icon: '🚚', sortOrder: 3,
    description: 'Ev, ofis ve parça taşıma',
    subServices: JSON.stringify(['Ev Taşıma', 'Ofis Taşıma', 'Parça Eşya', 'Piyano Taşıma', 'Asansörlü Taşıma']),
    avgPriceMin: 600, avgPriceMax: 8000,
  },
  {
    name: 'Elektrikçi', icon: '⚡', sortOrder: 4,
    description: 'Elektrik arıza, tesisat ve montaj',
    subServices: JSON.stringify(['Arıza Tespiti', 'Priz & Anahtar', 'Aydınlatma', 'Sigorta Panosu', 'Kablo Çekimi']),
    avgPriceMin: 250, avgPriceMax: 2000,
  },
  {
    name: 'Tesisat', icon: '🔧', sortOrder: 5,
    description: 'Su tesisatı, tıkanıklık ve kaçak giderme',
    subServices: JSON.stringify(['Tıkanıklık Açma', 'Su Kaçağı', 'Banyo Yenileme', 'Musluk Değişimi', 'Kombi Servis']),
    avgPriceMin: 300, avgPriceMax: 3000,
  },
  {
    name: 'Klima Servis', icon: '❄️', sortOrder: 6,
    description: 'Klima montaj, bakım ve arıza',
    subServices: JSON.stringify(['Klima Montajı', 'Bakım & Temizlik', 'Gaz Dolumu', 'Arıza Tespiti', 'Söküm']),
    avgPriceMin: 400, avgPriceMax: 2500,
  },
  {
    name: 'Mobilya Montaj', icon: '🪑', sortOrder: 7,
    description: 'IKEA, dolap, kitaplık ve mobilya montajı',
    subServices: JSON.stringify(['IKEA Montaj', 'Dolap Montajı', 'Kitaplık', 'Bebek Odası', 'TV Ünitesi']),
    avgPriceMin: 200, avgPriceMax: 1500,
  },
];

async function main() {
  console.log('\n🌱 seed-categories-v2 başlıyor...\n');

  for (const cat of categories) {
    // Var mı kontrol et
    const existing = await all('SELECT id FROM categories WHERE name = ?', [cat.name]);
    if (existing.length > 0) {
      await run(
        `UPDATE categories SET icon=?, description=?, subServices=?, avgPriceMin=?, avgPriceMax=?, sortOrder=?, isActive=1 WHERE name=?`,
        [cat.icon, cat.description, cat.subServices, cat.avgPriceMin, cat.avgPriceMax, cat.sortOrder, cat.name]
      );
      console.log(`  ✏️  Güncellendi: ${cat.icon} ${cat.name}`);
    } else {
      const { v4: uuidv4 } = require('uuid');
      await run(
        `INSERT INTO categories (id,name,icon,description,subServices,avgPriceMin,avgPriceMax,sortOrder,isActive,createdAt,updatedAt)
         VALUES (?,?,?,?,?,?,?,?,1,datetime('now'),datetime('now'))`,
        [uuidv4(), cat.name, cat.icon, cat.description, cat.subServices, cat.avgPriceMin, cat.avgPriceMax, cat.sortOrder]
      );
      console.log(`  ➕  Eklendi: ${cat.icon} ${cat.name}`);
    }
  }

  // Worker profillerini güncelle — Emre: Tesisat + Elektrikçi
  await run(
    `UPDATE users SET workerCategories=?, workerBio=?, hourlyRateMin=?, hourlyRateMax=?, isAvailable=1, serviceRadiusKm=25 WHERE id=?`,
    [
      JSON.stringify(['Tesisat', 'Elektrikçi']),
      '10 yıllık deneyimli tesisat ve elektrik ustası. Garantili işçilik, aynı gün servis.',
      200, 600,
      EMRE,
    ]
  );
  console.log('  🔧 Emre worker profili güncellendi (Tesisat + Elektrikçi)');

  // Selin: Temizlik + Boya & Badana
  await run(
    `UPDATE users SET workerCategories=?, workerBio=?, hourlyRateMin=?, hourlyRateMax=?, isAvailable=1, serviceRadiusKm=20 WHERE id=?`,
    [
      JSON.stringify(['Temizlik', 'Boya & Badana']),
      'Profesyonel temizlik ekibi. Ekolojik ürünler kullanıyoruz. Boya badana işleri de yapıyoruz.',
      150, 400,
      SELIN,
    ]
  );
  console.log('  🧹 Selin worker profili güncellendi (Temizlik + Boya)');

  // Kategori kontrol
  const cats = await all('SELECT name, icon, avgPriceMin, avgPriceMax FROM categories ORDER BY sortOrder');
  console.log('\n📋 Kategoriler:');
  for (const c of cats) console.log(`  ${c.icon} ${c.name}  (${c.avgPriceMin}-${c.avgPriceMax} TL)`);

  // Worker kontrol
  const workers = await all(
    `SELECT fullName, workerCategories, hourlyRateMin, hourlyRateMax, isAvailable FROM users WHERE isAvailable=1`
  );
  console.log('\n👷 Aktif Ustalar:');
  for (const w of workers) {
    const cats = JSON.parse(w.workerCategories || '[]');
    console.log(`  ${w.fullName}: ${cats.join(', ')} — ${w.hourlyRateMin}-${w.hourlyRateMax} TL/saat`);
  }

  console.log('\n✅ seed-categories-v2 tamamlandı!\n');
}

main().catch(e => { console.error('HATA:', e.message); process.exit(1); }).finally(() => db.close());
