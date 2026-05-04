/**
 * Seed script: 4 kullanıcı (2 müşteri + 2 usta), provider profilleri,
 * işler ve çapraz teklifler ekler. Mevcut veriye dokunmaz.
 */
const sqlite3 = require('sqlite3');
const crypto = require('crypto');

const db = new sqlite3.Database('./hizmet_db.sqlite');
const run = (sql, params = []) =>
  new Promise((res, rej) =>
    db.run(sql, params, function (err) {
      if (err) rej(err);
      else res(this);
    })
  );
const all = (sql, params = []) =>
  new Promise((res, rej) =>
    db.all(sql, params, (err, rows) => (err ? rej(err) : res(rows)))
  );

// Şifre: Test1234 (bcrypt rounds=10)
const bcryptHash = '$2b$10$OMYocARTUMCg85OSMu1Pje2eszdmTg2gT6swKvN/BBxkxJPebcrGy';

function uuid() {
  return crypto.randomUUID();
}

async function main() {
  // Mevcut test e-postalarını kontrol et
  const existing = await all('SELECT email FROM users');
  const existingEmails = new Set(existing.map((r) => r.email));

  // ─── 4 kullanıcı ───────────────────────────────────────────────────
  // Şifre: Test1234  →  bcrypt hash (rounds=10)
  const PW = '$2b$10$wfEUYT8JdLWxSmxMVjNH8.qXU44hGqG7hI5d4s4wHLxPx2mEvHCo6';

  const users = [
    // Müşteriler
    { id: uuid(), fullName: 'Fatma Demir', phone: '05301000001', email: 'fatma@test.com', role: 'customer', tokens: 200 },
    { id: uuid(), fullName: 'Mehmet Can', phone: '05301000002', email: 'mehmet@test.com', role: 'customer', tokens: 150 },
    // Ustalar
    { id: uuid(), fullName: 'Hasan Kaya', phone: '05301000003', email: 'hasan@test.com', role: 'worker', tokens: 50 },
    { id: uuid(), fullName: 'Zeynep Arslan', phone: '05301000004', email: 'zeynep@test.com', role: 'worker', tokens: 50 },
  ];

  const inserted = [];
  for (const u of users) {
    if (existingEmails.has(u.email)) {
      const row = await all('SELECT * FROM users WHERE email=?', [u.email]);
      inserted.push(row[0]);
      console.log(`⏭  Kullanıcı zaten var: ${u.email}`);
    } else {
      await run(
        `INSERT INTO users (id, fullName, phoneNumber, email, passwordHash, role, tokenBalance, isPhoneVerified, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
        [u.id, u.fullName, u.phone, u.email, PW, u.role, u.tokens]
      );
      const row = await all('SELECT * FROM users WHERE id=?', [u.id]);
      inserted.push(row[0]);
      console.log(`✅ Kullanıcı eklendi: ${u.email} (${u.role})`);
    }
  }

  const [fatma, mehmet, hasan, zeynep] = inserted;

  // ─── Kategori IDs ──────────────────────────────────────────────────
  const cats = await all("SELECT id, name FROM categories WHERE isActive=1");
  const catMap = {};
  cats.forEach((c) => (catMap[c.name] = c.id));

  const boyaCatId = catMap['Boya & Badana'] || cats[0]?.id;
  const tesisatCatId = catMap['Tesisat'] || cats[1]?.id;
  const temizlikCatId = catMap['Temizlik'] || cats[2]?.id;
  const elektrikCatId = catMap['Elektrikçi'] || cats[3]?.id;

  // ─── Provider profilleri ───────────────────────────────────────────
  const existingProviders = await all('SELECT userId FROM providers');
  const existingProviderUsers = new Set(existingProviders.map((p) => p.userId));

  let hasanProvider, zeynepProvider;

  if (!existingProviderUsers.has(hasan.id)) {
    const pid = uuid();
    await run(
      `INSERT INTO providers (id, userId, businessName, bio, averageRating, totalReviews, isVerified, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 4.7, 12, 0, datetime('now'), datetime('now'))`,
      [pid, hasan.id, 'Hasan Boya Badana', 'Boya ve badana işlerinde 10 yıl tecrübe. Kaliteli iş garantisi.']
    );
    hasanProvider = (await all('SELECT * FROM providers WHERE id=?', [pid]))[0];
    console.log(`✅ Provider profili: Hasan Kaya`);
  } else {
    hasanProvider = (await all('SELECT * FROM providers WHERE userId=?', [hasan.id]))[0];
    console.log(`⏭  Provider zaten var: Hasan Kaya`);
  }

  if (!existingProviderUsers.has(zeynep.id)) {
    const pid = uuid();
    await run(
      `INSERT INTO providers (id, userId, businessName, bio, averageRating, totalReviews, isVerified, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 4.9, 28, 1, datetime('now'), datetime('now'))`,
      [pid, zeynep.id, 'Zeynep Tesisat & Elektrik', 'Profesyonel tesisat ve elektrik hizmetleri. Acil çağrı alıyorum.']
    );
    zeynepProvider = (await all('SELECT * FROM providers WHERE id=?', [pid]))[0];
    console.log(`✅ Provider profili: Zeynep Arslan`);
  } else {
    zeynepProvider = (await all('SELECT * FROM providers WHERE userId=?', [zeynep.id]))[0];
    console.log(`⏭  Provider zaten var: Zeynep Arslan`);
  }

  // ─── Fatma'nın ilanları ────────────────────────────────────────────
  const existingJobs = await all('SELECT title FROM jobs');
  const existingTitles = new Set(existingJobs.map((j) => j.title));

  const fatmaJobs = [];
  const jobsToInsert = [
    {
      title: '3 Odalı Ev Badana',
      desc: 'Boyalı kısımların tamamının yenilenmesi gerekiyor. Beyaz renk tercihim var.',
      cat: 'Boya & Badana',
      catId: boyaCatId,
      min: 800, max: 1500,
    },
    {
      title: 'Mutfak Lavabo Tamiri',
      desc: 'Lavabo altındaki boru sızdırıyor, acil tamir gerekli.',
      cat: 'Tesisat',
      catId: tesisatCatId,
      min: 200, max: 500,
    },
  ];

  for (const j of jobsToInsert) {
    if (!existingTitles.has(j.title)) {
      const jid = uuid();
      await run(
        `INSERT INTO jobs (id, title, description, category, categoryId, location, budgetMin, budgetMax, status, customerId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 'İstanbul', ?, ?, 'open', ?, datetime('now'), datetime('now'))`,
        [jid, j.title, j.desc, j.cat, j.catId, j.min, j.max, fatma.id]
      );
      const row = (await all('SELECT * FROM jobs WHERE id=?', [jid]))[0];
      fatmaJobs.push(row);
      console.log(`✅ İlan eklendi (Fatma): ${j.title}`);
    } else {
      const row = (await all('SELECT * FROM jobs WHERE title=?', [j.title]))[0];
      fatmaJobs.push(row);
      console.log(`⏭  İlan zaten var: ${j.title}`);
    }
  }

  // ─── Mehmet'in ilanları ───────────────────────────────────────────
  const mehmetJobs = [];
  const mehmetJobsToInsert = [
    {
      title: 'Haftalık Ofis Temizliği',
      desc: '3 katlı ofis binası, haftada 2 gün temizlik hizmeti.',
      cat: 'Temizlik',
      catId: temizlikCatId,
      min: 1200, max: 2500,
    },
    {
      title: 'Sigorta Panosu Değişimi',
      desc: 'Eski sigorta panosunun modern otomatik sigortayla değiştirilmesi.',
      cat: 'Elektrikçi',
      catId: elektrikCatId,
      min: 400, max: 800,
    },
  ];

  for (const j of mehmetJobsToInsert) {
    if (!existingTitles.has(j.title)) {
      const jid = uuid();
      await run(
        `INSERT INTO jobs (id, title, description, category, categoryId, location, budgetMin, budgetMax, status, customerId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 'Ankara', ?, ?, 'open', ?, datetime('now'), datetime('now'))`,
        [jid, j.title, j.desc, j.cat, j.catId, j.min, j.max, mehmet.id]
      );
      const row = (await all('SELECT * FROM jobs WHERE id=?', [jid]))[0];
      mehmetJobs.push(row);
      console.log(`✅ İlan eklendi (Mehmet): ${j.title}`);
    } else {
      const row = (await all('SELECT * FROM jobs WHERE title=?', [j.title]))[0];
      mehmetJobs.push(row);
      console.log(`⏭  İlan zaten var: ${j.title}`);
    }
  }

  // ─── Teklifler ─────────────────────────────────────────────────────
  // Mevcut teklifleri kontrol et
  const existingOffers = await all('SELECT jobId, providerId FROM offers');
  const offerSet = new Set(existingOffers.map((o) => `${o.jobId}-${o.providerId}`));

  const offersToInsert = [
    // Hasan → Fatma'nın badana ilanına (pending)
    {
      jobId: fatmaJobs[0]?.id,
      providerId: hasanProvider?.id,
      price: 1100,
      message: 'Merhaba, 2 günde bitirebilirim. Kaliteli boya kullanıyorum.',
      status: 'pending',
    },
    // Zeynep → Fatma'nın tesisat ilanına (pending)
    {
      jobId: fatmaJobs[1]?.id,
      providerId: zeynepProvider?.id,
      price: 350,
      message: 'Aynı gün gelebilirim, parça dahil fiyattır.',
      status: 'pending',
    },
    // Hasan → Mehmet'in temizlik ilanına (countered - müşteri pazarlık yaptı)
    {
      jobId: mehmetJobs[0]?.id,
      providerId: hasanProvider?.id,
      price: 2000,
      message: 'Ekibimle haftada 2 gün geliyorum, profesyonel ekipman.',
      status: 'countered',
      counterPrice: 1600,
      counterMessage: 'Fiyat biraz yüksek, 1600 yapabilir misiniz?',
    },
    // Zeynep → Mehmet'in elektrik ilanına (accepted)
    {
      jobId: mehmetJobs[1]?.id,
      providerId: zeynepProvider?.id,
      price: 650,
      message: 'Elektrik lisanslı ustayım, garantili iş.',
      status: 'accepted',
    },
  ];

  for (const o of offersToInsert) {
    if (!o.jobId || !o.providerId) {
      console.log(`⚠️  Teklif atlandı: jobId veya providerId eksik`);
      continue;
    }
    const key = `${o.jobId}-${o.providerId}`;
    if (offerSet.has(key)) {
      console.log(`⏭  Teklif zaten var: job=${o.jobId.slice(0, 8)}`);
      continue;
    }
    const oid = uuid();
    await run(
      `INSERT INTO offers (id, jobId, providerId, price, message, status, counterPrice, counterMessage, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [oid, o.jobId, o.providerId, o.price, o.message, o.status,
       o.counterPrice ?? null, o.counterMessage ?? null]
    );
    console.log(`✅ Teklif eklendi: ${o.status} | ${o.price}₺ → job ${o.jobId.slice(0, 8)}`);

    // Token düşüm kaydı
    const txId = uuid();
    const prov2 = await all('SELECT userId FROM providers WHERE id=?', [o.providerId]);
    if (prov2[0]) {
      await run(
        `INSERT INTO token_transactions (id, userId, type, amount, description, status, createdAt)
         VALUES (?, ?, 'spend', ?, ?, 'completed', datetime('now'))`,
        [txId, prov2[0].userId, 5, `İlan #${o.jobId.slice(0, 8)} için teklif (${o.price} ₺)`]
      );
    }
  }

  // Token düşümlerini uygula
  for (const o of offersToInsert) {
    if (!o.jobId || !o.providerId) continue;
    const key = `${o.jobId}-${o.providerId}`;
    if (!offerSet.has(key)) {
      // provider'ın user id'sini bul
      const prov = await all('SELECT userId FROM providers WHERE id=?', [o.providerId]);
      if (prov[0]) {
        await run('UPDATE users SET tokenBalance = MAX(0, tokenBalance - 5) WHERE id=?', [prov[0].userId]);
      }
    }
  }

  // ─── Özet ─────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════');
  console.log('SEED TAMAMLANDI\n');
  const allUsers = await all('SELECT fullName, email, role, tokenBalance FROM users ORDER BY createdAt');
  console.log('Kullanıcılar:');
  allUsers.forEach(u => console.log(`  ${u.role.padEnd(8)} ${u.fullName.padEnd(20)} ${u.email.padEnd(25)} 💰${u.tokenBalance}`));

  const allOffers = await all('SELECT o.id, j.title, o.price, o.status, o.counterPrice FROM offers o JOIN jobs j ON j.id=o.jobId');
  console.log('\nTeklifler:');
  allOffers.forEach(o => console.log(`  [${o.status.padEnd(9)}] ${o.price}₺ ${o.counterPrice ? '→ pazarlık: '+o.counterPrice+'₺' : ''} "${o.title}"`));

  db.close();
}

main().catch((err) => {
  console.error('HATA:', err);
  db.close();
  process.exit(1);
});
