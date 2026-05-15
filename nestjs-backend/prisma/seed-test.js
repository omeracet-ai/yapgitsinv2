const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 [MÜDÜR] Test verileri oluşturuluyor...');

  const clientId = 'test-client-uid-001';
  const providerId = 'test-provider-uid-002';

  // 1. Müşteri kullanıcı
  await prisma.$executeRawUnsafe(`
    INSERT INTO users (id, email, fullName, phoneNumber, role, tokenBalance, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO NOTHING
  `, clientId, 'ahmet@test.com', 'Ahmet Yılmaz', '+905001110001', 'user', 500.0);

  // 2. Usta kullanıcı
  await prisma.$executeRawUnsafe(`
    INSERT INTO users (id, email, fullName, phoneNumber, role, tokenBalance, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO NOTHING
  `, providerId, 'mehmet@usta.com', 'Mehmet Usta', '+905002220002', 'user', 100.0);

  // 3. İş ilanı
  const jobId = randomUUID();
  await prisma.$executeRawUnsafe(`
    INSERT INTO jobs (id, title, description, category, status, budgetMin, budgetMax, location, customerId, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `, jobId, 'Acil Klima Tamiri', 'Salon tipi klimam soğutmuyor, gaz basılması gerekebilir.',
     'klima-isitma', 'open', 1000, 2000, 'İstanbul, Beşiktaş', clientId);

  // 4. Teklif
  const offerId = randomUUID();
  await prisma.$executeRawUnsafe(`
    INSERT INTO offers (id, jobId, userId, price, message, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `, offerId, jobId, providerId, 1500.0, 'Selamlar, aynı gün gelip gaz dolumu yapabilirim.', 'pending');

  const [client] = await prisma.$queryRawUnsafe(`SELECT fullName FROM users WHERE id = ?`, clientId);
  const [worker] = await prisma.$queryRawUnsafe(`SELECT fullName FROM users WHERE id = ?`, providerId);

  console.log('✅ [MÜDÜR] Veritabanı ilişkilendirmeleri tamam!');
  console.log(`🔗 Müşteri: ${client.fullName}, İş: Acil Klima Tamiri, Usta: ${worker.fullName}, Teklif: 1500 TL`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
