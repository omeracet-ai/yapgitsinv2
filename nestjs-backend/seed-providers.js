/**
 * Her kategori için en az 3 provider ekler (idempotent).
 * Şifre: Test1234
 */
const sqlite3 = require('sqlite3');
const crypto = require('crypto');

const db = new sqlite3.Database('./hizmet_db.sqlite');
const run = (sql, params = []) =>
  new Promise((res, rej) =>
    db.run(sql, params, function (err) { if (err) rej(err); else res(this); })
  );
const all = (sql, params = []) =>
  new Promise((res, rej) =>
    db.all(sql, params, (err, rows) => (err ? rej(err) : res(rows)))
  );

const PW = '$2b$10$OMYocARTUMCg85OSMu1Pje2eszdmTg2gT6swKvN/BBxkxJPebcrGy'; // Test1234

function uuid() { return crypto.randomUUID(); }

// Her kategori için usta tanımları
// Mevcut ustalar: Hasan(Boya&Badana), Zeynep(Tesisat+Elektrik), Ahmet(genel)
const NEW_WORKERS = [
  // ── Temizlik ──────────────────────────────────────────────────────────
  { email: 'ali.temizlik@test.com',   fullName: 'Ali Yıldız',      phone: '05301000010', tokens: 60,
    biz: 'Ali Temizlik',              bio: 'Ev ve ofis temizliği, derin temizlik hizmeti. İstanbul genelinde.', rating: 4.6, reviews: 34, verified: true },
  { email: 'ayse.temizlik@test.com',  fullName: 'Ayşe Korkmaz',    phone: '05301000011', tokens: 55,
    biz: 'Ayşe Ev Temizlik',          bio: 'Haftalık ve aylık temizlik paketleri. Güvenilir ve titiz hizmet.', rating: 4.8, reviews: 21, verified: true },
  { email: 'murat.temiz@test.com',    fullName: 'Murat Şahin',     phone: '05301000012', tokens: 45,
    biz: 'Murat Temizlik Hizmetleri', bio: 'Temizlik sektöründe 8 yıl. Ekipman ve malzeme tarafımızdan.', rating: 4.5, reviews: 18, verified: false },

  // ── Boya & Badana ─────────────────────────────────────────────────────
  { email: 'kemal.boya@test.com',     fullName: 'Kemal Öztürk',    phone: '05301000013', tokens: 50,
    biz: 'Kemal Boya Badana',         bio: 'İç ve dış cephe boya, dekoratif sıva. Uygun fiyat garantisi.', rating: 4.7, reviews: 15, verified: true },
  { email: 'burak.dekor@test.com',    fullName: 'Burak Çelik',     phone: '05301000014', tokens: 40,
    biz: 'Burak Dekorasyon',          bio: 'Boya, badana ve dekorasyon işleri. Hızlı ve temiz iş çıkarım.', rating: 4.4, reviews: 9,  verified: false },

  // ── Nakliyat ──────────────────────────────────────────────────────────
  { email: 'orhan.nakli@test.com',    fullName: 'Orhan Yılmaz',    phone: '05301000015', tokens: 70,
    biz: 'Orhan Nakliyat',            bio: 'Ev ve ofis taşımacılığı. Sigortalı eşya taşıma.', rating: 4.8, reviews: 47, verified: true },
  { email: 'serdar.nakli@test.com',   fullName: 'Serdar Bozkurt',  phone: '05301000016', tokens: 65,
    biz: 'Serdar Nakliyat',           bio: 'Şehir içi ve şehirlerarası taşımacılık. Araç filomuzla hizmetinizdeyiz.', rating: 4.6, reviews: 31, verified: true },
  { email: 'yusuf.nakli@test.com',    fullName: 'Yusuf Aydın',     phone: '05301000017', tokens: 50,
    biz: 'Yusuf Nakliye',             bio: 'Eşya taşıma, ambalajlama ve montaj hizmeti.', rating: 4.3, reviews: 12, verified: false },

  // ── Elektrikçi ────────────────────────────────────────────────────────
  { email: 'ibrahim.elek@test.com',   fullName: 'İbrahim Taş',     phone: '05301000018', tokens: 55,
    biz: 'İbrahim Elektrik',          bio: 'Elektrik tesisatı, pano montajı, aydınlatma. Lisanslı usta.', rating: 4.9, reviews: 52, verified: true },
  { email: 'caner.elek@test.com',     fullName: 'Caner Doğan',     phone: '05301000019', tokens: 45,
    biz: 'Caner Elektrik',            bio: 'Elektrik arıza, bakım onarım ve yeni tesisat.', rating: 4.5, reviews: 19, verified: true },

  // ── Tesisat ───────────────────────────────────────────────────────────
  { email: 'leyla.tesisat@test.com',  fullName: 'Leyla Kaya',      phone: '05301000020', tokens: 50,
    biz: 'Leyla Tesisat',             bio: 'Su tesisatı, kalorifer ve doğalgaz hizmetleri.', rating: 4.7, reviews: 24, verified: true },
  { email: 'erkan.tesisat@test.com',  fullName: 'Erkan Demir',     phone: '05301000021', tokens: 40,
    biz: 'Erkan Tesisat',             bio: 'Tesisat bakım onarım ve yeni kurulum. 7/24 acil servis.', rating: 4.4, reviews: 16, verified: false },

  // ── Klima Servis ──────────────────────────────────────────────────────
  { email: 'ramazan.klima@test.com',  fullName: 'Ramazan Güneş',   phone: '05301000022', tokens: 60,
    biz: 'Ramazan Klima Servis',      bio: 'Klima kurulum, bakım ve gaz dolumu. Tüm marka servis.', rating: 4.8, reviews: 38, verified: true },
  { email: 'tolga.klima@test.com',    fullName: 'Tolga Arslan',    phone: '05301000023', tokens: 55,
    biz: 'Tolga Klima',               bio: 'Split klima montajı ve bakım. Uygun fiyatlar.', rating: 4.6, reviews: 22, verified: true },
  { email: 'selim.iklim@test.com',    fullName: 'Selim Aktaş',     phone: '05301000024', tokens: 45,
    biz: 'Selim İklimlendirme',       bio: 'Klima servis ve bakım, kanal tipi sistemler.', rating: 4.3, reviews: 11, verified: false },

  // ── Mobilya Montaj ────────────────────────────────────────────────────
  { email: 'kaan.mobilya@test.com',   fullName: 'Kaan Erdoğan',    phone: '05301000025', tokens: 50,
    biz: 'Kaan Mobilya Montaj',       bio: 'Hazır mobilya montajı, IKEA uzmanı. Hızlı ve özenli.', rating: 4.7, reviews: 29, verified: true },
  { email: 'emre.montaj@test.com',    fullName: 'Emre Şimşek',     phone: '05301000026', tokens: 45,
    biz: 'Emre Montaj',               bio: 'Mobilya montaj ve demontaj, dolap kurulum hizmeti.', rating: 4.5, reviews: 17, verified: false },
  { email: 'fatih.mobilya@test.com',  fullName: 'Fatih Yıldırım',  phone: '05301000027', tokens: 40,
    biz: 'Fatih Mobilya',             bio: 'Genel mobilya montaj, tamiri ve yenileme hizmetleri.', rating: 4.2, reviews: 8,  verified: false },

  // ── Pet Kuaför ────────────────────────────────────────────────────────
  { email: 'seda.pet@test.com',       fullName: 'Seda Koç',        phone: '05301000028', tokens: 55,
    biz: 'Seda Pet Salon',            bio: 'Köpek ve kedi kuaförü, tıraş banyo hizmetleri.', rating: 4.9, reviews: 43, verified: true },
  { email: 'pinar.pet@test.com',      fullName: 'Pınar Avcı',      phone: '05301000029', tokens: 50,
    biz: 'Pınar Hayvan Bakım',        bio: 'Pet grooming, tırnak kesimi ve banyo hizmeti.', rating: 4.7, reviews: 26, verified: true },
  { email: 'cemre.pet@test.com',      fullName: 'Cemre Kılıç',     phone: '05301000030', tokens: 40,
    biz: 'Cemre Pet Kuaför',          bio: 'Evcil hayvan bakım ve kuaför hizmeti. Eve gelen servis.', rating: 4.5, reviews: 14, verified: false },
];

async function main() {
  const existing = await all('SELECT email FROM users');
  const existingEmails = new Set(existing.map((r) => r.email));
  const existingProviders = await all('SELECT userId FROM providers');
  const existingProviderUsers = new Set(existingProviders.map((p) => p.userId));

  let addedUsers = 0, addedProviders = 0;

  for (const w of NEW_WORKERS) {
    let userId;

    if (existingEmails.has(w.email)) {
      const row = await all('SELECT id FROM users WHERE email=?', [w.email]);
      userId = row[0].id;
      console.log(`⏭  Kullanıcı var: ${w.email}`);
    } else {
      userId = uuid();
      await run(
        `INSERT INTO users (id, fullName, phoneNumber, email, passwordHash, role, tokenBalance, isPhoneVerified, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 'worker', ?, 0, datetime('now'), datetime('now'))`,
        [userId, w.fullName, w.phone, w.email, PW, w.tokens]
      );
      addedUsers++;
      console.log(`✅ Kullanıcı: ${w.fullName} (${w.email})`);
    }

    if (!existingProviderUsers.has(userId)) {
      const pid = uuid();
      await run(
        `INSERT INTO providers (id, userId, businessName, bio, averageRating, totalReviews, isVerified, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [pid, userId, w.biz, w.bio, w.rating, w.reviews, w.verified ? 1 : 0]
      );
      addedProviders++;
      console.log(`   └─ Provider: ${w.biz} ★${w.rating}`);
    } else {
      console.log(`   └─ Provider zaten var: ${w.biz}`);
    }
  }

  // Özet
  const total = await all('SELECT COUNT(*) as n FROM providers');
  console.log(`\n══════════════════════════════════`);
  console.log(`TAMAMLANDI: +${addedUsers} kullanıcı, +${addedProviders} provider`);
  console.log(`Toplam provider: ${total[0].n}`);

  // Kategori bazlı provider sayıları (bio/businessName'e göre tahmin)
  const categories = ['Temizlik','Boya','Nakliyat','Elektrik','Tesisat','Klima','Mobilya','Pet'];
  console.log('\nKategori kapsama (bio/isim eşleşmesi):');
  for (const cat of categories) {
    const rows = await all(
      `SELECT COUNT(*) as n FROM providers WHERE lower(businessName) LIKE ? OR lower(bio) LIKE ?`,
      [`%${cat.toLowerCase()}%`, `%${cat.toLowerCase()}%`]
    );
    console.log(`  ${cat.padEnd(12)}: ${rows[0].n} provider`);
  }

  db.close();
}

main().catch((err) => {
  console.error('HATA:', err);
  db.close();
  process.exit(1);
});
