/**
 * Her user ve provider için test yorumları ekler (idempotent).
 * Provider'lara 3-5 müşteri yorumu, müşterilere 1-2 provider yorumu.
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

function uuid() { return crypto.randomUUID(); }

const PROVIDER_COMMENTS = [
  'Çok memnun kaldım, işini iyi biliyor.',
  'Hızlı ve kaliteli iş çıkardı, teşekkürler.',
  'Tam zamanında geldi ve eksiksiz tamamladı.',
  'Fiyat/performans açısından mükemmel.',
  'Çok profesyoneldi, kesinlikle tavsiye ederim.',
  'Temiz ve düzenli çalıştı.',
  'İkinci kez çalıştım, yine memnun kaldım.',
  'Güvenilir ve işini seven biri.',
  'Beklentilerimin üzerinde bir hizmet aldım.',
  'Detaylara gösterdiği özen için teşekkürler.',
];

const CUSTOMER_COMMENTS = [
  'Anlayışlı ve sabırlı bir müşteriydi.',
  'Gereksinimlerini net ifade etti, çalışması kolay oldu.',
  'Zamanında ödeme yaptı, tekrar çalışırım.',
  'İyi bir müşteri, işe ciddiyetle yaklaşıyor.',
  'Teşekkürler, bir dahaki iş için tercihim.',
  'Sorunsuz bir çalışma süreci geçirdik.',
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomRating(min = 4, max = 5) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// SQLite FK kapalı olduğundan placeholder jobId kullanıyoruz
const FAKE_JOB_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  const existing = await all('SELECT COUNT(*) as n FROM reviews');
  if (existing[0].n > 0) {
    console.log(`Zaten ${existing[0].n} yorum var, atlanıyor...`);
    db.close();
    return;
  }

  const customers = await all("SELECT id, fullName FROM users WHERE role='customer'");
  const providerRows = await all(
    "SELECT p.id as pid, p.userId, u.fullName FROM providers p JOIN users u ON u.id=p.userId"
  );

  console.log(`${customers.length} müşteri, ${providerRows.length} provider bulundu.`);

  let count = 0;

  // Her provider için 3-5 müşteri yorumu
  for (const prov of providerRows) {
    const n = 3 + Math.floor(Math.random() * 3);
    const reviewers = [...customers].sort(() => Math.random() - 0.5).slice(0, Math.min(n, customers.length));
    for (const customer of reviewers) {
      const daysAgo = Math.floor(Math.random() * 60);
      await run(
        `INSERT INTO reviews (id, jobId, reviewerId, revieweeId, rating, comment, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-${daysAgo} days'))`,
        [uuid(), FAKE_JOB_ID, customer.id, prov.userId, randomRating(4, 5), randomItem(PROVIDER_COMMENTS)]
      );
      count++;
    }
    process.stdout.write(`  Provider ${prov.fullName}: ${reviewers.length} yorum\n`);
  }

  // Her müşteri için 1-2 provider yorumu
  for (const customer of customers) {
    const n = 1 + Math.floor(Math.random() * 2);
    const reviewers = [...providerRows].sort(() => Math.random() - 0.5).slice(0, Math.min(n, providerRows.length));
    for (const prov of reviewers) {
      const daysAgo = Math.floor(Math.random() * 60);
      await run(
        `INSERT INTO reviews (id, jobId, reviewerId, revieweeId, rating, comment, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-${daysAgo} days'))`,
        [uuid(), FAKE_JOB_ID, prov.userId, customer.id, randomRating(4, 5), randomItem(CUSTOMER_COMMENTS)]
      );
      count++;
    }
  }

  // Provider istatistiklerini güncelle
  console.log('\nProvider istatistikleri güncelleniyor...');
  for (const prov of providerRows) {
    const reviews = await all('SELECT rating FROM reviews WHERE revieweeId=?', [prov.userId]);
    if (reviews.length > 0) {
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      await run(
        'UPDATE providers SET averageRating=?, totalReviews=? WHERE id=?',
        [Math.round(avg * 10) / 10, reviews.length, prov.pid]
      );
    }
  }

  const total = await all('SELECT COUNT(*) as n FROM reviews');
  console.log(`\nTAMAMLANDI: ${count} yorum eklendi (toplam: ${total[0].n})`);

  db.close();
}

main().catch((err) => {
  console.error('HATA:', err);
  db.close();
  process.exit(1);
});
