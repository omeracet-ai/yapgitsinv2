/**
 * seed-v2.js
 * 5 v2 kullanıcısı için: jobs, offers, reviews, photos, stats, puan sistemi
 * Kullanım: node seed-v2.js
 */
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const db = new sqlite3.Database('./hizmet_db.sqlite');

// ── Kullanıcı ID'leri ─────────────────────────────────────────────────────
const AYSE     = 'e92d4536-1687-4faa-b96d-106a088871da'; // hizmet alan
const CAN      = '006a81e7-e7bb-464c-97e7-4f434d85f389'; // hizmet alan
const NESLIHAN = 'a06d31ad-9765-414d-9ef2-558c253229fa'; // hizmet alan
const EMRE     = '2342f480-63e8-496b-b827-a1b8ce93fa14'; // hizmet veren
const SELIN    = 'ce0c0263-1598-4199-a04b-f94402238273'; // hizmet veren

// ── 4 örnek fotoğraf URL'si ───────────────────────────────────────────────
const PHOTOS = {
  cleaning: [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    'https://images.unsplash.com/photo-1527515545081-5db817172677?w=400',
  ],
  paint: [
    'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400',
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400',
  ],
  plumbing: [
    'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400',
    'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400',
  ],
  electric: [
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400',
    'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400',
  ],
};

// ── ID'ler ────────────────────────────────────────────────────────────────
const JOB1 = uuidv4(); // Ayse → Temizlik (tamamlandı)
const JOB2 = uuidv4(); // Ayse → Boya (tamamlandı)
const JOB3 = uuidv4(); // Can  → Tesisat (tamamlandı)
const JOB4 = uuidv4(); // Can  → Elektrik (iptal)
const JOB5 = uuidv4(); // Neslihan → Temizlik (açık)

const OFF1 = uuidv4(); const OFF2 = uuidv4(); const OFF3 = uuidv4();
const OFF4 = uuidv4(); const OFF5 = uuidv4(); const OFF6 = uuidv4();

const REV1 = uuidv4(); const REV2 = uuidv4(); const REV3 = uuidv4();
const REV4 = uuidv4(); const REV5 = uuidv4(); const REV6 = uuidv4();

function run(sql, params) {
  return new Promise((res, rej) =>
    db.run(sql, params || [], function(e) { e ? rej(e) : res(this); })
  );
}
function all(sql, params) {
  return new Promise((res, rej) =>
    db.all(sql, params || [], (e, rows) => e ? rej(e) : res(rows))
  );
}

function ago(days) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

async function main() {
  console.log('\n🌱 seed-v2 başlıyor...\n');

  // ── Eski v2 verisini temizle ─────────────────────────────────────────────
  const existingJobs = await all(
    `SELECT id FROM jobs WHERE customerId IN (?,?,?)`, [AYSE, CAN, NESLIHAN]
  );
  if (existingJobs.length) {
    const ids = existingJobs.map(r => r.id);
    const ph  = ids.map(() => '?').join(',');
    await run(`DELETE FROM offers  WHERE jobId IN (${ph})`, ids);
    await run(`DELETE FROM reviews WHERE jobId IN (${ph})`, ids);
    await run(`DELETE FROM jobs    WHERE id    IN (${ph})`, ids);
    console.log('🗑  Eski v2 verisi silindi');
  }

  // ── JOBS ─────────────────────────────────────────────────────────────────
  const jobs = [
    { id: JOB1, title: '3+1 Daire Genel Temizligi',     description: 'Tasinma sonrasi detayli temizlik. Mutfak ve banyolar dahil.',
      category: 'Temizlik',    location: 'Istanbul, Kadikoy',  budgetMin: 800,  budgetMax: 1200,
      status: 'completed', customerId: AYSE,    photos: JSON.stringify(PHOTOS.cleaning), createdAt: ago(14), updatedAt: ago(10) },

    { id: JOB2, title: 'Salon Boya Badana',             description: '2 oda beyaz boya, malzeme temin edilecek.',
      category: 'Boya & Badana', location: 'Istanbul, Kadikoy', budgetMin: 1200, budgetMax: 2000,
      status: 'completed', customerId: AYSE,    photos: JSON.stringify(PHOTOS.paint),    createdAt: ago(20), updatedAt: ago(16) },

    { id: JOB3, title: 'Mutfak Borusu Sizintisi',       description: 'Lavabo altinda sizinti var, acil tamirat.',
      category: 'Tesisat',     location: 'Ankara, Cankaya',    budgetMin: 300,  budgetMax: 600,
      status: 'completed', customerId: CAN,     photos: JSON.stringify(PHOTOS.plumbing), createdAt: ago(8),  updatedAt: ago(5)  },

    { id: JOB4, title: 'Sigorta Panosu Degisimi',       description: 'Eski panel yenisi ile degistirilecek.',
      category: 'Elektrikci',  location: 'Ankara, Cankaya',    budgetMin: 500,  budgetMax: 900,
      status: 'cancelled', customerId: CAN,     photos: JSON.stringify(PHOTOS.electric), createdAt: ago(5),  updatedAt: ago(3)  },

    { id: JOB5, title: 'Haftalik Ofis Temizligi',       description: '150 m2 ofis, haftada 2 gun.',
      category: 'Temizlik',    location: 'Izmir, Bornova',     budgetMin: 1500, budgetMax: 2500,
      status: 'open',      customerId: NESLIHAN, photos: JSON.stringify(PHOTOS.cleaning), createdAt: ago(2),  updatedAt: ago(2)  },
  ];

  for (const j of jobs) {
    await run(
      `INSERT INTO jobs (id,title,description,category,location,budgetMin,budgetMax,status,customerId,photos,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [j.id, j.title, j.description, j.category, j.location, j.budgetMin, j.budgetMax, j.status, j.customerId, j.photos, j.createdAt, j.updatedAt]
    );
    console.log(`  ✅ Job: ${j.title} [${j.status}]`);
  }

  // ── OFFERS ───────────────────────────────────────────────────────────────
  const offers = [
    { id: OFF1, jobId: JOB1, userId: EMRE,  price: 950,  message: 'Tecr. ekibimizle ayni gun baslayabiliriz.', status: 'accepted',  createdAt: ago(13) },
    { id: OFF2, jobId: JOB1, userId: SELIN, price: 1100, message: 'Ekolojik urunler kullaniyoruz.',            status: 'rejected',  createdAt: ago(13) },
    { id: OFF3, jobId: JOB2, userId: SELIN, price: 1500, message: 'Malzeme dahil, 2 gunde teslim.',            status: 'accepted',  createdAt: ago(19) },
    { id: OFF4, jobId: JOB3, userId: EMRE,  price: 450,  message: 'Ayni gun musaitim, garantili iscilik.',     status: 'accepted',  createdAt: ago(7)  },
    { id: OFF5, jobId: JOB4, userId: EMRE,  price: 700,  message: 'Pano malzemesi bendeydi.',                  status: 'rejected',  createdAt: ago(4)  },
    { id: OFF6, jobId: JOB5, userId: SELIN, price: 1800, message: 'Haftada 2 gun icin uygun fiyat.',           status: 'pending',   createdAt: ago(1)  },
  ];

  for (const o of offers) {
    await run(
      `INSERT INTO offers (id,jobId,userId,price,message,status,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?)`,
      [o.id, o.jobId, o.userId, o.price, o.message, o.status, o.createdAt, o.createdAt]
    );
    await run(
      `INSERT INTO token_transactions (id,userId,type,amount,description,status,createdAt) VALUES (?,?,'spend',5,'Teklif ucreti','completed',?)`,
      [uuidv4(), o.userId, o.createdAt]
    );
    await run(`UPDATE users SET tokenBalance = tokenBalance - 5 WHERE id = ?`, [o.userId]);
    const name = o.userId === EMRE ? 'Emre' : 'Selin';
    console.log(`  💸 Offer: ${name} → [${o.status}] ${o.price}TL`);
  }

  // ── REVIEWS ──────────────────────────────────────────────────────────────
  const reviews = [
    { id: REV1, jobId: JOB1, reviewerId: AYSE,  revieweeId: EMRE,  rating: 5,
      comment: 'Emre cok titiz ve dakikti, mukemmel temizlik. Kesinlikle tavsiye ederim!', createdAt: ago(10) },
    { id: REV2, jobId: JOB1, reviewerId: EMRE,  revieweeId: AYSE,  rating: 5,
      comment: 'Ayse hanim cok kibardi, odemeyi zamaninda yapti.',                         createdAt: ago(10) },
    { id: REV3, jobId: JOB2, reviewerId: AYSE,  revieweeId: SELIN, rating: 4,
      comment: 'Selin hanim duzenli ve hizli calisti, boya kalitesi iyiydi.',              createdAt: ago(16) },
    { id: REV4, jobId: JOB2, reviewerId: SELIN, revieweeId: AYSE,  rating: 4,
      comment: 'Guzel bir musteriydi, acik iletisim kurdu.',                               createdAt: ago(16) },
    { id: REV5, jobId: JOB3, reviewerId: CAN,   revieweeId: EMRE,  rating: 5,
      comment: 'Emre bey cok hizli geldi, sorunu 30 dakikada cozdu. Harika!',              createdAt: ago(5)  },
    { id: REV6, jobId: JOB3, reviewerId: EMRE,  revieweeId: CAN,   rating: 4,
      comment: 'Can bey detayli aciklama yapti, is kolaylasti.',                           createdAt: ago(5)  },
  ];

  for (const r of reviews) {
    await run(
      `INSERT INTO reviews (id,jobId,reviewerId,revieweeId,rating,comment,createdAt) VALUES (?,?,?,?,?,?,?)`,
      [r.id, r.jobId, r.reviewerId, r.revieweeId, r.rating, r.comment, r.createdAt]
    );
    const name = r.revieweeId === EMRE ? 'Emre' : r.revieweeId === SELIN ? 'Selin' : r.revieweeId === AYSE ? 'Ayse' : 'Can';
    console.log(`  ⭐ Review: ${r.rating} yildiz → ${name}`);
  }

  // ── İSTATİSTİKLER ────────────────────────────────────────────────────────
  await run(`UPDATE users SET asCustomerTotal=2, asCustomerSuccess=2, asCustomerFail=0 WHERE id=?`, [AYSE]);
  await run(`UPDATE users SET asCustomerTotal=2, asCustomerSuccess=1, asCustomerFail=1 WHERE id=?`, [CAN]);
  await run(`UPDATE users SET asCustomerTotal=1, asCustomerSuccess=0, asCustomerFail=0 WHERE id=?`, [NESLIHAN]);
  await run(`UPDATE users SET asWorkerTotal=3,   asWorkerSuccess=2,   asWorkerFail=1   WHERE id=?`, [EMRE]);
  await run(`UPDATE users SET asWorkerTotal=2,   asWorkerSuccess=1,   asWorkerFail=0   WHERE id=?`, [SELIN]);
  console.log('\n  📊 Istatistikler guncellendi');

  // ── PUAN SİSTEMİ ─────────────────────────────────────────────────────────
  // Emre:  5+5=10 → ort 5.0, rep = 5.0*20 + (0+2)*5 = 110
  // Selin: 4    → ort 4.0, rep = 4.0*20 + (0+1)*5 = 85
  // Ayse:  5+4=9 → ort 4.5, rep = 4.5*20 + (2+0)*5 = 100
  // Can:   4    → ort 4.0, rep = 4.0*20 + (1+0)*5 = 85
  await run(`UPDATE users SET averageRating=5.0, totalReviews=2, reputationScore=110 WHERE id=?`, [EMRE]);
  await run(`UPDATE users SET averageRating=4.0, totalReviews=1, reputationScore=85  WHERE id=?`, [SELIN]);
  await run(`UPDATE users SET averageRating=4.5, totalReviews=2, reputationScore=100 WHERE id=?`, [AYSE]);
  await run(`UPDATE users SET averageRating=4.0, totalReviews=1, reputationScore=85  WHERE id=?`, [CAN]);
  console.log('  ⭐ Puanlar hesaplandi');

  // ── SONUÇ RAPORU ─────────────────────────────────────────────────────────
  const users = await all(
    `SELECT fullName, email,
            asCustomerTotal, asCustomerSuccess, asCustomerFail,
            asWorkerTotal,   asWorkerSuccess,   asWorkerFail,
            averageRating, totalReviews, reputationScore, tokenBalance
     FROM users WHERE email LIKE '%v2.test%' ORDER BY email`
  );

  console.log('\n=========================================================');
  console.log(' KULLANICI RAPORU');
  console.log('=========================================================');
  for (const u of users) {
    const cRate = u.asCustomerTotal > 0 ? Math.round((u.asCustomerSuccess / u.asCustomerTotal) * 100) : 0;
    const wRate = u.asWorkerTotal   > 0 ? Math.round((u.asWorkerSuccess   / u.asWorkerTotal)   * 100) : 0;
    console.log(`\n  ${u.fullName} (${u.email})`);
    console.log(`    Hizmet Alan : ${u.asCustomerTotal} is | ✅${u.asCustomerSuccess} basarili ❌${u.asCustomerFail} basarisiz (%${cRate})`);
    console.log(`    Hizmet Veren: ${u.asWorkerTotal} is | ✅${u.asWorkerSuccess} basarili ❌${u.asWorkerFail} basarisiz (%${wRate})`);
    console.log(`    Puan: ${u.averageRating}★ (${u.totalReviews} yorum) | Rep: ${u.reputationScore} puan | Token: ${u.tokenBalance}`);
  }

  const jobCount = await all(`SELECT COUNT(*) as c FROM jobs WHERE customerId IN (?,?,?)`, [AYSE, CAN, NESLIHAN]);
  const revCount = await all(`SELECT COUNT(*) as c FROM reviews WHERE reviewerId IN (?,?,?,?,?)`, [AYSE, CAN, NESLIHAN, EMRE, SELIN]);
  console.log(`\n=========================================================`);
  console.log(` Jobs: ${jobCount[0].c} | Reviews: ${revCount[0].c} | Offers: ${offers.length}`);
  console.log(` 4 fotograf URL: her job'da 2'ser adet`);
  console.log('=========================================================');
  console.log('✅ seed-v2 tamamlandi!\n');
}

main()
  .catch(e => { console.error('\n❌ HATA:', e.message); process.exit(1); })
  .finally(() => db.close());
