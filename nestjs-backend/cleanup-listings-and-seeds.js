/* eslint-disable */
/**
 * cleanup-listings-and-seeds.js — TEK SEFERLİK veri temizliği (prod MariaDB).
 *
 * AMAÇ: omer.acet@gmail.com ve demo@yapgitsin.tr (+ admin@yapgitsin.tr) HESAPLARI
 * dışındaki TÜM kullanıcıları sil; ayrıca HERKESİN tüm ilanlarını (Job +
 * ServiceRequest) ve bütün işlemsel/per-user verisini temizle. Yapısal seed
 * (kategoriler, abonelik planları, onboarding slaytları, para birimleri, tenant,
 * platform/sistem ayarları, iptal politikaları, blog yazıları, promosyon kodları,
 * admin audit log) ve TypeORM `migrations` tablosu KORUNUR.
 *
 * GÜVENLİK:
 *   - Varsayılan DRY-RUN: hiçbir şey silinmez, sadece plan + satır sayıları yazılır.
 *   - Gerçek silme yalnızca CONFIRM_WIPE=YES ortam değişkeni ile çalışır.
 *   - Şemada SINIFLANDIRILMAMIŞ bir tablo bulunursa SCRIPT DURUR (yeni bir
 *     yapısal tablo yanlışlıkla silinmesin diye).
 *
 * ⚠️ ÖNCE YEDEK ALIN — geri dönüşü yoktur:
 *     mysqldump -u <user> -p <db> > yedek_$(date +%F).sql
 *
 * ÇALIŞTIRMA (nestjs-backend/ içinden, prod sunucuda):
 *   node cleanup-listings-and-seeds.js                       # önizleme (güvenli)
 *   $env:CONFIRM_WIPE="YES"; node cleanup-listings-and-seeds.js   # PowerShell — gerçek silme
 *   CONFIRM_WIPE=YES node cleanup-listings-and-seeds.js           # bash — gerçek silme
 */
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

// Prod env yükleme sırası (add-*.js ile aynı): production.local > production > .env
loadEnv(path.join(__dirname, '.env.production.local'));
loadEnv(path.join(__dirname, '.env.production'));
loadEnv(path.join(__dirname, '.env'));

/** Silinmeyecek hesaplar. admin korunur — yoksa onModuleInit yeniden oluşturur. */
const KEEP_USER_EMAILS = [
  'omer.acet@gmail.com',
  'demo@yapgitsin.tr',
  'admin@yapgitsin.tr',
];

/** Yapısal seed / sistem içeriği — ASLA silinmez. */
const KEEP_TABLES = new Set([
  'categories',
  'subscription_plans',
  'onboarding_slides',
  'currencies',
  'tenants',
  'platform_settings',
  'system_settings',
  'cancellation_policies',
  'blog_posts',
  'promo_codes',
  'admin_audit_logs',
]);

/** Tamamı boşaltılacak işlemsel / per-user tablolar. */
const WIPE_TABLES = new Set([
  // İlanlar + bağlı veriler
  'jobs',
  'offers',
  'job_questions',
  'job_question_replies',
  'saved_jobs',
  'service_requests',
  'service_request_applications',
  // Randevu / değerlendirme
  'bookings',
  'reviews',
  'review_helpfuls',
  // Escrow / ödeme / para
  'payment_escrows',
  'booking_escrows',
  'escrow_confirmation_photos',
  'escrow_confirmation_videos',
  'payments',
  'withdrawal_requests',
  'token_transactions',
  // Anlaşmazlık
  'job_disputes',
  'disputes',
  // Bildirim / sohbet
  'notifications',
  'chat_messages',
  // Boost / promosyon kullanımı
  'worker_boosts',
  'promo_redemptions',
  // Abonelikler
  'user_subscriptions',
  'category_subscriptions',
  // Favoriler / kayıtlı aramalar / şablonlar
  'favorite_providers',
  'favorite_workers',
  'saved_job_searches',
  'job_templates',
  // Usta profil ekleri
  'worker_insurances',
  'worker_certifications',
  // KVKK / rıza / engelleme / şikayet
  'user_consents',
  'data_deletion_requests',
  'user_blocks',
  'user_reports',
  // İtibar / rozet (per-user)
  'reputations',
  'badges',
  // Müsaitlik
  'availability_slots',
  'availability_blackouts',
  // Auth efemeral
  'sms_otps',
  'password_reset_tokens',
  'email_verification_tokens',
  'ip_otp_lockouts',
  // Sağlayıcı + lead'ler
  'providers',
  'leads',
  'lead_responses',
  'lead_requests',
]);

/** TypeORM iç tabloları — dokunma. */
const SYSTEM_TABLES = new Set(['migrations', 'typeorm_metadata']);

const USERS_TABLE = 'users';

(async () => {
  const confirm = process.env.CONFIRM_WIPE === 'YES';
  const dbName = process.env.DB_NAME || process.env.DB_DATABASE;

  console.log('═'.repeat(70));
  console.log(`  VERİ TEMİZLİĞİ — MariaDB: ${dbName}`);
  console.log(
    `  Mod: ${confirm ? '⚠️  GERÇEK SİLME (CONFIRM_WIPE=YES)' : '🔍 DRY-RUN (önizleme)'}`,
  );
  console.log('═'.repeat(70));

  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: dbName,
    });

    // ---- Şemadaki gerçek tablolar + sınıflandırma güvenlik kontrolü --------
    const [tblRows] = await conn.query(
      'SELECT TABLE_NAME AS t FROM information_schema.tables WHERE table_schema = ?',
      [dbName],
    );
    const actual = tblRows.map((r) => r.t);
    const actualSet = new Set(actual);

    const unclassified = actual.filter(
      (t) =>
        t !== USERS_TABLE &&
        !KEEP_TABLES.has(t) &&
        !WIPE_TABLES.has(t) &&
        !SYSTEM_TABLES.has(t),
    );
    if (unclassified.length) {
      console.error('\n❌ SINIFLANDIRILMAMIŞ TABLO(LAR) — script durduruldu:');
      unclassified.forEach((t) => console.error(`   - ${t}`));
      console.error(
        '\nBu tabloları KEEP_TABLES veya WIPE_TABLES listesine ekleyip tekrar çalıştırın.',
      );
      process.exitCode = 1;
      return;
    }

    // ---- Korunacak kullanıcılar -------------------------------------------
    const [keepUsers] = await conn.query(
      `SELECT id, email, fullName FROM \`${USERS_TABLE}\` WHERE email IN (?)`,
      [KEEP_USER_EMAILS],
    );
    const foundEmails = new Set(keepUsers.map((u) => u.email));

    console.log('\n👤 KORUNACAK kullanıcılar:');
    for (const email of KEEP_USER_EMAILS) {
      const u = keepUsers.find((x) => x.email === email);
      if (u) console.log(`   ✅ ${email}  (${u.fullName || '—'})`);
      else
        console.log(
          `   ⚠️  ${email}  — DB'de BULUNAMADI (silme listesinde sayılmayacak)`,
        );
    }

    const [tu] = await conn.query(
      `SELECT COUNT(*) AS c FROM \`${USERS_TABLE}\``,
    );
    const usersToDelete = Number(tu[0].c) - foundEmails.size;
    console.log(
      `\n🗑️  Silinecek kullanıcı sayısı: ${usersToDelete} (toplam ${tu[0].c} − korunan ${foundEmails.size})`,
    );

    // ---- Boşaltılacak tablolar + satır sayıları ---------------------------
    const wipeList = [...WIPE_TABLES].filter((t) => actualSet.has(t)).sort();
    console.log('\n🗑️  Boşaltılacak tablolar (mevcut satır sayısı):');
    let grandTotal = 0;
    for (const t of wipeList) {
      const [r] = await conn.query(`SELECT COUNT(*) AS c FROM \`${t}\``);
      const c = Number(r[0].c);
      grandTotal += c;
      if (c > 0) console.log(`   - ${t.padEnd(34)} ${c}`);
    }
    console.log(`   ${'TOPLAM (ilan/işlem satırı)'.padEnd(34)} ${grandTotal}`);

    console.log('\n💾 KORUNACAK yapısal tablolar (dokunulmaz):');
    console.log(
      '   ' + [...KEEP_TABLES].filter((t) => actualSet.has(t)).sort().join(', '),
    );

    if (!confirm) {
      console.log('\n🔍 DRY-RUN bitti — HİÇBİR ŞEY SİLİNMEDİ.');
      console.log('   Gerçek silme için (ÖNCE YEDEK ALIN):');
      console.log('     PowerShell:  $env:CONFIRM_WIPE="YES"; node cleanup-listings-and-seeds.js');
      console.log('     bash:        CONFIRM_WIPE=YES node cleanup-listings-and-seeds.js');
      return;
    }

    // ---- GERÇEK SİLME -----------------------------------------------------
    console.log('\n⚠️  Silme başlıyor — FK kontrolleri geçici kapatılıyor...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.beginTransaction();
    try {
      for (const t of wipeList) {
        await conn.query(`DELETE FROM \`${t}\``);
      }
      await conn.query(
        `DELETE FROM \`${USERS_TABLE}\` WHERE email NOT IN (?)`,
        [KEEP_USER_EMAILS],
      );
      await conn.commit();
      console.log('✅ Silme işlemi commit edildi.');
    } catch (err) {
      await conn.rollback();
      console.error('❌ Hata — işlem geri alındı (rollback):', err.message);
      throw err;
    } finally {
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    // ---- Doğrulama --------------------------------------------------------
    const [after] = await conn.query(
      `SELECT email FROM \`${USERS_TABLE}\``,
    );
    console.log(`\n🔎 Doğrulama — kalan kullanıcı: ${after.length}`);
    after.forEach((u) => console.log(`   - ${u.email}`));
    for (const t of ['jobs', 'service_requests', 'offers'].filter((t) => actualSet.has(t))) {
      const [r] = await conn.query(`SELECT COUNT(*) AS c FROM \`${t}\``);
      console.log(`   ${t}: ${r[0].c} satır`);
    }
    console.log('\n✅ Temizlik tamamlandı.');
  } catch (e) {
    console.error('[err]', e.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
})();
