import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { faker, Faker, tr, base } from '@faker-js/faker';
import * as nodemailer from 'nodemailer';
import { User, UserRole } from '../users/user.entity';
import { Booking, BookingStatus } from '../bookings/booking.entity';
import { PaymentEscrow, EscrowStatus } from '../escrow/payment-escrow.entity';
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
} from '../payments/payment.entity';
import { Review } from '../reviews/review.entity';
import { JobLead } from '../leads/job-lead.entity';
import { JobLeadResponse } from '../leads/job-lead-response.entity';
import { Category } from '../categories/category.entity';
import { ServiceRequest } from '../service-requests/service-request.entity';
import { Job, JobStatus, JobKind } from '../jobs/job.entity';
import { Offer, OfferStatus } from '../jobs/offer.entity';
import { JobQuestion } from '../jobs/job-question.entity';
import { JobQuestionReply } from '../jobs/job-question-reply.entity';
import { Provider } from '../providers/provider.entity';

export interface WipeCounts {
  reviews: number;
  payments: number;
  escrows: number;
  bookings: number;
  jobLeadResponses: number;
  jobLeads: number;
  serviceRequests: number;
  users: number;
}

export interface CreateCounts {
  users: number;
  workers: number;
  customers: number;
  jobs: number;
  jobResponses: number;
  bookings: number;
  escrows: number;
  payments: number;
  reviews: number;
  serviceRequests: number;
  // Phase Two-Sided + tam demo
  jobsRequest: number;
  jobsOffer: number;
  offers: number;
  questions: number;
  replies: number;
  providers: number;
}

/** Şehir merkezleri — admin Harita için pin koordinatları. */
const CITY_COORDS: Record<string, [number, number]> = {
  Istanbul: [41.0082, 28.9784],
  Ankara: [39.9334, 32.8597],
  Izmir: [38.4192, 27.1287],
  Bursa: [40.1828, 29.0665],
  Antalya: [36.8969, 30.7133],
  Adana: [37.0, 35.3213],
  Konya: [37.8746, 32.4932],
  Gaziantep: [37.0662, 37.3833],
  Kayseri: [38.7312, 35.4787],
  Eskisehir: [39.7767, 30.5206],
};

// bcrypt hash of "Yapgitsin1234!" (cost 10) — generated once, deterministic
// to avoid 50× bcrypt overhead during populate. Verified 2026-05-19.
const SEED_PASSWORD_HASH =
  '$2b$10$mTsH6R8sQUJInRzLNROW6OEqBiWE71i7oOcc/rfKh.uyzTCJXpFxe';

const TR_CITIES = [
  'Istanbul',
  'Ankara',
  'Izmir',
  'Bursa',
  'Antalya',
  'Adana',
  'Konya',
  'Gaziantep',
  'Kayseri',
  'Eskisehir',
];

// Türkçe bio şablonları — kategori adı `{cat}` placeholder'ı ile doldurulur.
const TR_BIO_TEMPLATES = [
  '{years} yıllık {cat} tecrübesiyle hizmet veriyorum. İşçilik garantili, fiyatlar uygundur.',
  '{cat} alanında ustalaştım, titiz ve zamanında çalışırım. Müşteri memnuniyeti önceliğimdir.',
  'Profesyonel {cat} hizmeti. Keşif ücretsiz, randevu esnek. Hafta sonu da hizmet veriyorum.',
  '{cat} işlerinde {years} yıl deneyim. Kaliteli malzeme, temiz işçilik, makul fiyat.',
  '{cat} dahil pek çok alanda hizmet veriyorum. Acil durumlarda da arayabilirsiniz.',
  'Aile şirketi olarak {cat} alanında çalışıyoruz. Referansla iş yapıyoruz.',
  '{cat} konusunda uzmanım. Önce keşif yapıp net fiyat veririm, sürprizsiz çalışma.',
  'Sigortalı ve faturalı {cat} hizmeti. İş bitimine kadar garantilidir.',
  '{cat} hizmetinde hız ve kaliteyi bir arada sunuyorum. Şehir içi her bölgeye gelirim.',
  '{years} yıldır {cat} işiyle uğraşıyorum, işimi severek yapıyorum. Memnuniyet garantili.',
];

// Türkçe iş açıklaması şablonları (kısa).
const TR_JOB_DESCRIPTIONS = [
  'Acil bir şekilde halledilmesi gerekiyor, en kısa zamanda dönüş bekliyorum.',
  'Malzeme bende mevcut, sadece işçilik gerekiyor.',
  'Detaylı keşif sonrası fiyat anlaşması yapabiliriz.',
  'Hafta içi öğleden sonra müsaitim, evdeyim.',
  'Daha önce yapılmış bir işin tamamlanması gerekiyor.',
  'Apartman 3. katta, asansör yok. Buna göre fiyatlandırın lütfen.',
  'Faturalı ve garantili çalışmasını rica ediyorum.',
  'Birden fazla yerde aynı iş var, toplu fiyat verebilirsiniz.',
  'Hızlı ve temiz çalışılmasını önemsiyorum.',
  'İlk önce yerinde görmenizi rica ediyorum.',
];

// Worker response message havuzu.
const TR_WORKER_RESPONSES = [
  'Merhaba, ben bu işi yapabilirim. Müsait gün için iletişime geçelim.',
  'İlgileniyorum, detaylar için arayabilir misiniz?',
  'Bu hafta uygunum, fiyat keşiften sonra netleşir.',
  'Görüşmek isterim, fotoğraf paylaşırsanız ön fiyat verebilirim.',
  'Tecrübeliyim, referans verebilirim. Bekliyorum.',
  'Yarın sabah bölgenizdeyim, uğrayabilirim.',
];

// Booking açıklamaları (kısa).
const TR_BOOKING_NOTES = [
  'Anahtarlar kapıcıda olacak, randevu saatinde teslim alabilirsiniz.',
  'Adres tarifi için mesaj atın, kolayca bulabilirsiniz.',
  'Apartman önünde park yeri mevcut.',
  'İşin tamamlanmasını aynı gün bekliyorum.',
  'Ödeme iş bitiminde nakit veya havale olabilir.',
  'Kediler ev içinde, kapıyı dikkatli açın lütfen.',
];

function pickFromArray<T>(arr: T[], rand: () => number = Math.random): T {
  return arr[Math.floor(rand() * arr.length)];
}

function buildTurkishBio(cats: string[]): string {
  const primary = cats[0] ?? 'hizmet';
  const years = 2 + Math.floor(Math.random() * 18);
  const tpl = pickFromArray(TR_BIO_TEMPLATES);
  let bio = tpl
    .replace(/\{cat\}/g, primary)
    .replace(/\{years\}/g, String(years));
  // İkinci cümle: ekstra kategori varsa onu ima et.
  if (cats.length > 1) {
    bio += ` Ayrıca ${cats.slice(1, 3).join(' ve ')} işleri de yapıyorum.`;
  }
  return bio;
}

/** Tek-seferlik temizlik — KORUNACAK yapısal/sistem tabloları (asla silinmez). */
const CLEANUP_KEEP_TABLES = new Set<string>([
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

/** Tek-seferlik temizlik — TAMAMI boşaltılacak işlemsel / per-user tablolar. */
const CLEANUP_WIPE_TABLES = new Set<string>([
  'jobs',
  'offers',
  'job_questions',
  'job_question_replies',
  'saved_jobs',
  'service_requests',
  'service_request_applications',
  'bookings',
  'reviews',
  'review_helpfuls',
  'payment_escrows',
  'booking_escrows',
  'escrow_confirmation_photos',
  'escrow_confirmation_videos',
  'payments',
  'withdrawal_requests',
  'token_transactions',
  'job_disputes',
  'disputes',
  'notifications',
  'chat_messages',
  'worker_boosts',
  'promo_redemptions',
  'user_subscriptions',
  'category_subscriptions',
  'favorite_providers',
  'favorite_workers',
  'saved_job_searches',
  'job_templates',
  'worker_insurances',
  'worker_certifications',
  'user_consents',
  'data_deletion_requests',
  'user_blocks',
  'user_reports',
  'reputations',
  'badges',
  'availability_slots',
  'availability_blackouts',
  'sms_otps',
  'password_reset_tokens',
  'email_verification_tokens',
  'ip_otp_lockouts',
  'providers',
  'leads',
  'lead_responses',
  'lead_requests',
]);

/** TypeORM iç tabloları — dokunma. */
const CLEANUP_SYSTEM_TABLES = new Set<string>(['migrations', 'typeorm_metadata']);

export interface CleanupResult {
  driver: string;
  keptUsers: string[];
  missingKeepEmails: string[];
  usersDeleted: number;
  wiped: Record<string, number>;
  remainingUsers: string[];
}

@Injectable()
export class AdminSeedService {
  private readonly logger = new Logger(AdminSeedService.name);
  private readonly trFaker = new Faker({ locale: [tr, base] });

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Tek-seferlik veri temizliği: `keepEmails` dışındaki TÜM kullanıcıları ve
   * HERKESİN tüm ilan/işlemsel verisini siler; yapısal seed korunur.
   * Sınıflandırılmamış bir entity tablosu bulunursa (yeni tablo) HATA atar.
   */
  async cleanupKeepUsers(keepEmails: string[]): Promise<CleanupResult> {
    const driver = this.dataSource.options.type as string;
    const q = (id: string) => (driver === 'mysql' ? `\`${id}\`` : `"${id}"`);
    const ph = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        driver === 'postgres' ? `$${i + 1}` : '?',
      ).join(', ');

    // Sınıflandırma güvenlik kontrolü — her entity tablosu KEEP/WIPE/system/users olmalı.
    const meta = this.dataSource.entityMetadatas.map((m) => m.tableName);
    const unclassified = meta.filter(
      (t) =>
        t !== 'users' &&
        !CLEANUP_KEEP_TABLES.has(t) &&
        !CLEANUP_WIPE_TABLES.has(t) &&
        !CLEANUP_SYSTEM_TABLES.has(t),
    );
    if (unclassified.length) {
      throw new Error(
        `Sınıflandırılmamış tablo(lar) — temizlik durduruldu: ${unclassified.join(', ')}`,
      );
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      // Fiziksel olarak var olan boşaltılacak tablolar
      const wipeList: string[] = [];
      for (const t of [...CLEANUP_WIPE_TABLES].sort()) {
        if (meta.includes(t) && (await qr.hasTable(t))) wipeList.push(t);
      }

      // Korunacak kullanıcılar gerçekten var mı?
      const keptRows: Array<{ email: string }> = await qr.query(
        `SELECT email FROM ${q('users')} WHERE email IN (${ph(keepEmails.length)})`,
        keepEmails,
      );
      const keptUsers = keptRows.map((r) => r.email);
      const missingKeepEmails = keepEmails.filter((e) => !keptUsers.includes(e));

      // Silmeden önce satır sayıları (rapor için)
      const wiped: Record<string, number> = {};
      for (const t of wipeList) {
        const r: Array<{ c: number }> = await qr.query(
          `SELECT COUNT(*) AS c FROM ${q(t)}`,
        );
        wiped[t] = Number(r[0].c);
      }
      const ud: Array<{ c: number }> = await qr.query(
        `SELECT COUNT(*) AS c FROM ${q('users')} WHERE email NOT IN (${ph(keepEmails.length)})`,
        keepEmails,
      );
      const usersDeleted = Number(ud[0].c);

      // FK kontrollerini geçici kapat (dialect'e göre)
      if (driver === 'mysql') await qr.query('SET FOREIGN_KEY_CHECKS = 0');
      else if (driver === 'sqlite') await qr.query('PRAGMA foreign_keys = OFF');
      else if (driver === 'postgres')
        await qr.query("SET session_replication_role = 'replica'");

      await qr.startTransaction();
      try {
        for (const t of wipeList) {
          await qr.query(`DELETE FROM ${q(t)}`);
        }
        await qr.query(
          `DELETE FROM ${q('users')} WHERE email NOT IN (${ph(keepEmails.length)})`,
          keepEmails,
        );
        await qr.commitTransaction();
      } catch (e) {
        await qr.rollbackTransaction();
        throw e;
      } finally {
        if (driver === 'mysql') await qr.query('SET FOREIGN_KEY_CHECKS = 1');
        else if (driver === 'sqlite')
          await qr.query('PRAGMA foreign_keys = ON');
        else if (driver === 'postgres')
          await qr.query("SET session_replication_role = 'origin'");
      }

      const remaining: Array<{ email: string }> = await qr.query(
        `SELECT email FROM ${q('users')}`,
      );
      this.logger.warn(
        `[cleanup] ${usersDeleted} kullanıcı + ${Object.values(wiped).reduce((a, b) => a + b, 0)} işlem satırı silindi. Kalan kullanıcı: ${remaining.length}`,
      );
      return {
        driver,
        keptUsers,
        missingKeepEmails,
        usersDeleted,
        wiped,
        remainingUsers: remaining.map((r) => r.email),
      };
    } finally {
      await qr.release();
    }
  }

  /**
   * Sadece İLAN grafiğini siler — kullanıcı/booking/review/token/chat KORUNUR.
   * "Tüm hizmet ilanlarını sil" için: jobs (request+offer) + service_requests +
   * bunların doğrudan alt kayıtları (offers/questions/replies/applications/saved).
   * Users tablosuna HİÇ dokunmaz → emailVerified vb. şema-drift'inden bağımsız.
   * Var olmayan tabloları atlar; FK kontrollerini geçici kapatır; tek transaction.
   */
  async cleanupListings(): Promise<{
    driver: string;
    wiped: Record<string, number>;
    remainingJobs: number;
    remainingServiceRequests: number;
  }> {
    const driver = this.dataSource.options.type as string;
    const q = (id: string) => (driver === 'mysql' ? `\`${id}\`` : `"${id}"`);

    // Silme sırası — çocuk → kök (FK kapalı olsa da güvenli sıra).
    const LISTING_TABLES = [
      'job_question_replies',
      'job_questions',
      'offers',
      'saved_jobs',
      'service_request_applications',
      'service_requests',
      'jobs',
    ];

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      const present: string[] = [];
      for (const t of LISTING_TABLES) {
        if (await qr.hasTable(t)) present.push(t);
      }

      const wiped: Record<string, number> = {};
      for (const t of present) {
        const r: Array<{ c: number }> = await qr.query(
          `SELECT COUNT(*) AS c FROM ${q(t)}`,
        );
        wiped[t] = Number(r[0].c);
      }

      if (driver === 'mysql') await qr.query('SET FOREIGN_KEY_CHECKS = 0');
      else if (driver === 'sqlite') await qr.query('PRAGMA foreign_keys = OFF');
      else if (driver === 'postgres')
        await qr.query("SET session_replication_role = 'replica'");

      await qr.startTransaction();
      try {
        for (const t of present) {
          await qr.query(`DELETE FROM ${q(t)}`);
        }
        await qr.commitTransaction();
      } catch (e) {
        await qr.rollbackTransaction();
        throw e;
      } finally {
        if (driver === 'mysql') await qr.query('SET FOREIGN_KEY_CHECKS = 1');
        else if (driver === 'sqlite')
          await qr.query('PRAGMA foreign_keys = ON');
        else if (driver === 'postgres')
          await qr.query("SET session_replication_role = 'origin'");
      }

      const jc: Array<{ c: number }> = (await qr.hasTable('jobs'))
        ? await qr.query(`SELECT COUNT(*) AS c FROM ${q('jobs')}`)
        : [{ c: 0 }];
      const sc: Array<{ c: number }> = (await qr.hasTable('service_requests'))
        ? await qr.query(`SELECT COUNT(*) AS c FROM ${q('service_requests')}`)
        : [{ c: 0 }];
      const total = Object.values(wiped).reduce((a, b) => a + b, 0);
      this.logger.warn(`[cleanup-listings] ${total} ilan satırı silindi.`);
      return {
        driver,
        wiped,
        remainingJobs: Number(jc[0].c),
        remainingServiceRequests: Number(sc[0].c),
      };
    } finally {
      await qr.release();
    }
  }

  /**
   * Wipe order — leaves to roots, respecting FK chains.
   * Even if User cascades are configured, we delete explicitly for safety.
   */
  async wipeAll(): Promise<WipeCounts> {
    return this.dataSource.transaction(async (manager) => {
      const counts: WipeCounts = {
        reviews: 0,
        payments: 0,
        escrows: 0,
        bookings: 0,
        jobLeadResponses: 0,
        jobLeads: 0,
        serviceRequests: 0,
        users: 0,
      };
      const wipeAll = async (entity: any): Promise<number> => {
        const res = await manager
          .createQueryBuilder()
          .delete()
          .from(entity)
          .execute();
        return res.affected ?? 0;
      };
      counts.reviews = await wipeAll(Review);
      // Two-Sided chain — sırasıyla: replies → questions → offers → jobs
      await wipeAll(JobQuestionReply);
      await wipeAll(JobQuestion);
      await wipeAll(Offer);
      await wipeAll(Job);
      await wipeAll(Provider);
      counts.payments = await wipeAll(Payment);
      counts.escrows = await wipeAll(PaymentEscrow);
      counts.bookings = await wipeAll(Booking);
      counts.jobLeadResponses = await wipeAll(JobLeadResponse);
      counts.jobLeads = await wipeAll(JobLead);
      counts.serviceRequests = await wipeAll(ServiceRequest);
      counts.users = await wipeAll(User);
      return counts;
    });
  }

  async populate(count: number): Promise<CreateCounts> {
    return this.dataSource.transaction(async (manager) => {
      const f = this.trFaker;
      const created: CreateCounts = {
        users: 0,
        workers: 0,
        customers: 0,
        jobs: 0,
        jobResponses: 0,
        bookings: 0,
        escrows: 0,
        payments: 0,
        reviews: 0,
        serviceRequests: 0,
        jobsRequest: 0,
        jobsOffer: 0,
        offers: 0,
        questions: 0,
        replies: 0,
        providers: 0,
      };

      const allCategories = await manager.getRepository(Category).find();
      const categoryNames = allCategories.length
        ? allCategories.map((c) => c.name)
        : ['Temizlik', 'Elektrikci', 'Tesisat', 'Tasimacilik', 'Boya'];

      // ── 1. Users ───────────────────────────────────────────────────────────
      const users: User[] = [];
      const usedPhones = new Set<string>();

      // ── Sabit demo hesap — login için bilinen kimlik bilgisi ────────────
      // bysabri0@gmail.com / Yapgitsin1234!  (worker; gerçek kategorilerle)
      const demoCats = categoryNames.slice(0, 3);
      const [demoLat, demoLng] = CITY_COORDS.Istanbul;
      const demo = manager.getRepository(User).create({
        fullName: 'Demo Usta',
        phoneNumber: '+905058764282',
        email: 'bysabri0@gmail.com',
        passwordHash: SEED_PASSWORD_HASH,
        isPhoneVerified: true,
        emailVerified: true,
        identityVerified: true,
        role: UserRole.USER,
        tenantId: null,
        city: 'Istanbul',
        workerCategories: demoCats,
        workerBio: buildTurkishBio(demoCats),
        hourlyRateMinMinor: 12000,
        hourlyRateMaxMinor: 25000,
        isAvailable: true,
        latitude: demoLat + (Math.random() - 0.5) * 0.06,
        longitude: demoLng + (Math.random() - 0.5) * 0.06,
        profileImageUrl: 'https://i.pravatar.cc/300?u=demo-usta',
      });
      users.push(demo);
      usedPhones.add('+905058764282');
      created.workers++;

      for (let i = 0; i < count; i++) {
        const isWorker = Math.random() < 0.2;
        // Unique TR phone +905XXXXXXXX (12 chars total, kept under length=20)
        let phone: string;
        do {
          phone = '+9055' + faker.string.numeric(8);
        } while (usedPhones.has(phone));
        usedPhones.add(phone);

        const firstName = f.person.firstName();
        const lastName = f.person.lastName();
        const city = TR_CITIES[Math.floor(Math.random() * TR_CITIES.length)];
        const [cLat, cLng] = CITY_COORDS[city] ?? CITY_COORDS.Istanbul;
        const u = manager.getRepository(User).create({
          fullName: `${firstName} ${lastName}`.slice(0, 100),
          phoneNumber: phone,
          email: faker.internet
            .email({
              firstName: firstName.replace(/[^a-zA-Z]/g, ''),
              lastName: lastName.replace(/[^a-zA-Z]/g, ''),
            })
            .toLowerCase(),
          passwordHash: SEED_PASSWORD_HASH,
          isPhoneVerified: true,
          emailVerified: true,
          identityVerified: faker.datatype.boolean({ probability: 0.7 }),
          role: UserRole.USER,
          tenantId: null,
          city,
          // Phase Two-Sided — admin Harita pin'leri için lat/lng + avatar
          latitude: cLat + (Math.random() - 0.5) * 0.08,
          longitude: cLng + (Math.random() - 0.5) * 0.08,
          profileImageUrl: `https://i.pravatar.cc/300?u=${phone}`,
        });
        if (isWorker) {
          const cats = faker.helpers.arrayElements(
            categoryNames,
            faker.number.int({
              min: 2,
              max: Math.min(5, categoryNames.length),
            }),
          );
          u.workerCategories = cats;
          u.workerBio = buildTurkishBio(cats);
          u.hourlyRateMinMinor = faker.number.int({ min: 5000, max: 20000 });
          u.hourlyRateMaxMinor =
            (u.hourlyRateMinMinor ?? 5000) +
            faker.number.int({ min: 5000, max: 30000 });
          u.isAvailable = true;
          created.workers++;
        } else {
          created.customers++;
        }
        users.push(u);
      }
      await manager.getRepository(User).save(users);
      created.users = users.length;

      const workers = users.filter((u) => u.workerCategories?.length);
      const customers = users.filter((u) => !u.workerCategories?.length);

      // ── 2. Job leads ────────────────────────────────────────────────────────
      const jobLeads: JobLead[] = [];
      const leadCount = Math.max(1, Math.floor(count / 5));
      if (customers.length > 0) {
        for (let i = 0; i < leadCount; i++) {
          const customer = faker.helpers.arrayElement(customers);
          const cat = faker.helpers.arrayElement(categoryNames);
          const budgetMin = faker.number.int({ min: 100, max: 800 });
          const lead = manager.getRepository(JobLead).create({
            customerId: customer.id,
            category: cat,
            city: customer.city || faker.helpers.arrayElement(TR_CITIES),
            description: `${cat} hizmeti gerekiyor. ${faker.helpers.arrayElement(TR_JOB_DESCRIPTIONS)}`,
            budgetMin,
            budgetMax: budgetMin + faker.number.int({ min: 100, max: 1200 }),
            budgetVisible: faker.datatype.boolean(),
            requesterName: customer.fullName,
            requesterPhone: customer.phoneNumber ?? undefined,
            requesterEmail: customer.email,
            preferredContactTime: faker.helpers.arrayElement([
              'today',
              'this_week',
              'flexible',
            ]),
            status: faker.helpers.arrayElement([
              'open',
              'in_progress',
              'closed',
            ]),
          });
          jobLeads.push(lead);
        }
        await manager.getRepository(JobLead).save(jobLeads);
      }
      created.jobs = jobLeads.length;

      // ── 3. Job lead responses (50% of leads get 1-3) ────────────────────────
      const responses: JobLeadResponse[] = [];
      if (workers.length > 0) {
        for (const lead of jobLeads) {
          if (Math.random() > 0.5) continue;
          const respWorkers = faker.helpers.arrayElements(
            workers,
            faker.number.int({ min: 1, max: Math.min(3, workers.length) }),
          );
          for (const w of respWorkers) {
            responses.push(
              manager.getRepository(JobLeadResponse).create({
                leadId: lead.id,
                workerId: w.id,
                status: faker.helpers.arrayElement([
                  'sent_email',
                  'viewed',
                  'contacted',
                  'accepted',
                  'rejected',
                ]),
                workerMessage: faker.helpers.arrayElement(TR_WORKER_RESPONSES),
                respondedAt: faker.date.recent({ days: 30 }),
              }),
            );
          }
        }
        if (responses.length)
          await manager.getRepository(JobLeadResponse).save(responses);
      }
      created.jobResponses = responses.length;

      // ── 4. Bookings + Escrow + Payment + Review chain ───────────────────────
      const bookings: Booking[] = [];
      const escrows: PaymentEscrow[] = [];
      const payments: Payment[] = [];
      const reviews: Review[] = [];

      if (workers.length > 0 && customers.length > 0) {
        // Phase Two-Sided demo — bookingCount artırıldı (count/4 → count/2)
        const bookingCount = Math.max(8, Math.floor(count / 2));
        const workerNotes = [
          'İş tamamlandı, her şey istenildiği gibi yapıldı.',
          'Söz verdiğim gün geldim, sorunsuz teslim ettim.',
          'Müşteri ile uyumlu çalıştık, ek talep olmadı.',
          'Garanti kapsamında 1 yıl boyunca takipteyim.',
          'Malzeme dahil teslim ettim, kalitesinden eminim.',
        ];
        const customerNotes = [
          'Anahtar kapıcıda, randevu saatinde teslim alabilirsiniz.',
          'Apartman önünde park yeri mevcut.',
          'Adres tarifi için mesaj atın.',
          'Ödeme iş bitiminde havale.',
          'Kediler ev içinde dikkat.',
        ];
        for (let i = 0; i < bookingCount; i++) {
          const customer = faker.helpers.arrayElement(customers);
          const worker = faker.helpers.arrayElement(workers);
          const cat = faker.helpers.arrayElement(
            worker.workerCategories ?? categoryNames,
          );
          const priceMinor = faker.number.int({ min: 10000, max: 200000 });
          // %50 COMPLETED, %20 IN_PROGRESS, %15 CONFIRMED, %10 CANCELLED, %5 PENDING
          const status = faker.helpers.weightedArrayElement([
            { weight: 50, value: BookingStatus.COMPLETED },
            { weight: 20, value: BookingStatus.IN_PROGRESS },
            { weight: 15, value: BookingStatus.CONFIRMED },
            { weight: 10, value: BookingStatus.CANCELLED },
            { weight: 5, value: BookingStatus.PENDING },
          ]);
          // Tarih: COMPLETED için geçmiş, diğerleri için yakın gelecek
          const isCompleted = status === BookingStatus.COMPLETED;
          const scheduledDate = isCompleted
            ? faker.date.past({ years: 0.5 }).toISOString().slice(0, 10)
            : faker.date.soon({ days: 14 }).toISOString().slice(0, 10);
          const booking = manager.getRepository(Booking).create({
            customerId: customer.id,
            workerId: worker.id,
            category: cat,
            description: `${cat} işi: ${faker.helpers.arrayElement(TR_BOOKING_NOTES)}`,
            address:
              `${customer.city ?? 'Istanbul'} - ${f.location.streetAddress()}`.slice(
                0,
                200,
              ),
            scheduledDate,
            scheduledTime: `${faker.number.int({ min: 9, max: 17 })}:00`,
            status,
            agreedPriceMinor: priceMinor,
            agreedPrice: priceMinor / 100,
            // Geçmiş iş detayları — completion not + customer not
            workerNote: isCompleted
              ? faker.helpers.arrayElement(workerNotes)
              : null,
            customerNote: faker.helpers.arrayElement(customerNotes),
            // İptal edilenlere cancellation alanları
            cancelledAt:
              status === BookingStatus.CANCELLED
                ? faker.date.past({ years: 0.2 })
                : null,
            cancelledBy:
              status === BookingStatus.CANCELLED
                ? Math.random() < 0.5
                  ? customer.id
                  : worker.id
                : null,
          });
          bookings.push(booking);
        }
        await manager.getRepository(Booking).save(bookings);

        for (const b of bookings) {
          const platformFeeMinor = Math.round((b.agreedPriceMinor ?? 0) * 0.1);
          const workerPayoutMinor =
            (b.agreedPriceMinor ?? 0) - platformFeeMinor;
          const escrowStatus =
            b.status === BookingStatus.COMPLETED
              ? EscrowStatus.RELEASED
              : EscrowStatus.HELD;
          const escrow = manager.getRepository(PaymentEscrow).create({
            jobId: b.id,
            offerId: b.id, // synthetic
            customerId: b.customerId,
            taskerId: b.workerId,
            amount: (b.agreedPriceMinor ?? 0) / 100,
            amountMinor: b.agreedPriceMinor ?? 0,
            platformFeePct: 10,
            platformFeeAmount: platformFeeMinor / 100,
            platformFeeMinor,
            taskerNetAmount: workerPayoutMinor / 100,
            workerPayoutMinor,
            currency: 'TRY',
            status: escrowStatus,
            paymentStatus: 'paid',
            releasedAt:
              escrowStatus === EscrowStatus.RELEASED ? new Date() : null,
          });
          escrows.push(escrow);

          payments.push(
            manager.getRepository(Payment).create({
              customerId: b.customerId,
              workerId: b.workerId,
              bookingId: b.id,
              amountMinor: b.agreedPriceMinor ?? 0,
              currency: 'TRY',
              status: PaymentStatus.COMPLETED,
              method: PaymentMethod.MOCK,
              completedAt: new Date(),
              description: `Booking ${b.id} payment`,
            }),
          );

          // Reviews only for COMPLETED
          if (b.status === BookingStatus.COMPLETED) {
            reviews.push(
              manager.getRepository(Review).create({
                jobId: null,
                reviewerId: b.customerId,
                revieweeId: b.workerId,
                rating: faker.number.int({ min: 3, max: 5 }),
                comment: faker.helpers.arrayElement([
                  'İşini titizlikle yapıyor, çok memnun kaldım. Tavsiye ederim.',
                  'Zamanında geldi, fiyatı uygundu. Tekrar çalışırım.',
                  'Gerçekten profesyonel, ilgili ve güleryüzlü. Teşekkürler!',
                  'Beklediğimden iyi bir iş çıkardı. Eline sağlık.',
                  'Hızlı dönüş yaptı, anlaşma sorunsuz oldu.',
                  'Detaylara dikkat ediyor, kaliteli işçilik.',
                ]),
              }),
            );
          }
        }

        if (escrows.length)
          await manager.getRepository(PaymentEscrow).save(escrows);
        if (payments.length)
          await manager.getRepository(Payment).save(payments);

        // Phase 283 — Her worker için ek random review'lar (3-8 adet)
        const trComments = [
          'İşini titizlikle yapıyor, çok memnun kaldım. Tavsiye ederim.',
          'Zamanında geldi, fiyatı uygundu. Tekrar çalışırım.',
          'Gerçekten profesyonel, ilgili ve güleryüzlü. Teşekkürler!',
          'Beklediğimden iyi bir iş çıkardı. Eline sağlık.',
          'Uzun yıllar deneyimi belli oluyor, çok başarılı.',
          'Hızlı dönüş yaptı, anlaşma sorunsuz oldu.',
          'Detaylara dikkat ediyor, kaliteli işçilik.',
          'Beklentiyi karşıladı, fiyat-performans iyi.',
          'İletişimi güçlü, sorunsuz tamamladı.',
          'Sonuçtan çok memnunum, tekrar tercih ederim.',
          'Beklediğim gibi olmadı, daha hızlı olabilirdi.',
          'Genel olarak iyiydi ama bazı eksikler kaldı.',
          'Fiyatı biraz yüksekti ama iş güzeldi.',
        ];
        const extraReviews: Review[] = [];
        for (const worker of workers) {
          const numReviews = faker.number.int({ min: 3, max: 8 });
          for (let i = 0; i < numReviews; i++) {
            const customer = faker.helpers.arrayElement(customers);
            if (customer.id === worker.id) continue;
            // 80% chance 4-5 star, 15% 3 star, 5% 1-2 star (realistic dist)
            const rating = faker.helpers.weightedArrayElement([
              { weight: 50, value: 5 },
              { weight: 30, value: 4 },
              { weight: 15, value: 3 },
              { weight: 4, value: 2 },
              { weight: 1, value: 1 },
            ]);
            extraReviews.push(
              manager.getRepository(Review).create({
                jobId: null,
                reviewerId: customer.id,
                revieweeId: worker.id,
                rating,
                comment: faker.helpers.arrayElement(trComments),
              }),
            );
          }
        }
        if (extraReviews.length) {
          await manager.getRepository(Review).save(extraReviews);
          reviews.push(...extraReviews);
        }

        // Update worker stats: averageRating, totalReviews, reputationScore
        for (const worker of workers) {
          const workerReviews = reviews.filter(
            (r) => r.revieweeId === worker.id,
          );
          if (workerReviews.length === 0) continue;
          const sum = workerReviews.reduce((s, r) => s + r.rating, 0);
          const avg = sum / workerReviews.length;
          await manager.getRepository(User).update(worker.id, {
            averageRating: Math.round(avg * 10) / 10,
            totalReviews: workerReviews.length,
            asWorkerTotal: workerReviews.length,
            asWorkerSuccess: workerReviews.filter((r) => r.rating >= 4).length,
          });
        }

        if (reviews.length) await manager.getRepository(Review).save(reviews);
      }

      created.bookings = bookings.length;
      created.escrows = escrows.length;
      created.payments = payments.length;
      created.reviews = reviews.length;

      // ── 5. Service Requests (hizmet alanı ilanları) — 30% of customers ──────
      const serviceRequests: ServiceRequest[] = [];
      if (customers.length > 0) {
        const srCount = Math.max(1, Math.floor(customers.length * 0.3));
        for (let i = 0; i < srCount; i++) {
          const customer = faker.helpers.arrayElement(customers);
          const cat = faker.helpers.arrayElement(categoryNames);
          const city = customer.city || faker.helpers.arrayElement(TR_CITIES);
          const budgetMin = faker.number.int({ min: 100, max: 800 });
          const budgetMax =
            budgetMin + faker.number.int({ min: 100, max: 1500 });
          const priceMinor = budgetMax * 100;
          const sr = manager.getRepository(ServiceRequest).create({
            userId: customer.id,
            tenantId: null,
            category: cat,
            title: `${cat} hizmeti aranıyor — ${city}`.slice(0, 200),
            description: `${cat} hizmetine ihtiyacım var. ${faker.helpers.arrayElement(TR_JOB_DESCRIPTIONS)} Bütçe: ${budgetMin}-${budgetMax} TL.`,
            location: city,
            address: `${city} - ${f.location.streetAddress()}`.slice(0, 500),
            price: budgetMax,
            priceMinor,
            status: faker.helpers.arrayElement(['open', 'open', 'closed']),
          });
          serviceRequests.push(sr);
        }
        await manager.getRepository(ServiceRequest).save(serviceRequests);
      }
      created.serviceRequests = serviceRequests.length;

      // ── 6. Provider rows (worker'lar için) ───────────────────────────────
      const providers: Provider[] = [];
      for (const w of workers) {
        const featured = Math.random() < 0.2;
        providers.push(
          manager.getRepository(Provider).create({
            userId: w.id,
            businessName: w.fullName,
            bio: w.workerBio,
            isVerified: w.identityVerified === true,
            averageRating: w.averageRating ?? 0,
            totalReviews: w.totalReviews ?? 0,
            featuredOrder: featured
              ? providers.filter((p) => p.featuredOrder !== null).length + 1
              : null,
          } as Partial<Provider>),
        );
      }
      if (providers.length)
        await manager.getRepository(Provider).save(providers);
      created.providers = providers.length;

      // ── 7. Jobs (kind='request') — Müşteri talep ilanları ─────────────────
      const allJobs: Job[] = [];
      // Fırsatlar sekmesi open ilan ağırlıklı görünsün — status dağılımı
      // %60 OPEN, %15 in_progress, %15 completed, %10 cancelled
      const requestStatuses = [
        JobStatus.OPEN,
        JobStatus.OPEN,
        JobStatus.OPEN,
        JobStatus.OPEN,
        JobStatus.OPEN,
        JobStatus.OPEN,
        JobStatus.IN_PROGRESS,
        JobStatus.IN_PROGRESS,
        JobStatus.COMPLETED,
        JobStatus.CANCELLED,
      ];
      // Phase Two-Sided — Fırsatlar dolu olsun: her müşteri ~1.5 talep
      const requestCount = Math.max(15, Math.floor(customers.length * 1.5));
      // Phase Two-Sided demo — geçmiş iş için placeholder foto havuzu
      const completionPhotoUrls = (seed: string, n: number) =>
        Array.from(
          { length: n },
          (_, i) => `https://picsum.photos/seed/${seed}-${i}/600/400`,
        );
      for (let i = 0; i < requestCount; i++) {
        const customer = faker.helpers.arrayElement(customers);
        const cat = faker.helpers.arrayElement(categoryNames);
        const [bLat, bLng] =
          CITY_COORDS[customer.city ?? 'Istanbul'] ?? CITY_COORDS.Istanbul;
        const budgetMin = faker.number.int({ min: 200, max: 1500 });
        const status = faker.helpers.arrayElement(requestStatuses);
        const isCompleted = status === JobStatus.COMPLETED;
        const isInProgress = status === JobStatus.IN_PROGRESS;
        const createdAt = isCompleted
          ? faker.date.past({ years: 0.5 })
          : isInProgress
            ? faker.date.recent({ days: 14 })
            : faker.date.recent({ days: 30 });
        allJobs.push(
          manager.getRepository(Job).create({
            customerId: customer.id,
            kind: JobKind.REQUEST,
            title:
              `${cat} hizmeti aranıyor — ${faker.helpers.arrayElement(['acil', 'esnek', 'hafta sonu', 'bu hafta'])}`.slice(
                0,
                200,
              ),
            description: faker.helpers.arrayElement(TR_JOB_DESCRIPTIONS),
            category: cat,
            location:
              `${customer.city ?? 'Istanbul'} - ${f.location.streetAddress()}`.slice(
                0,
                200,
              ),
            latitude: bLat + (Math.random() - 0.5) * 0.08,
            longitude: bLng + (Math.random() - 0.5) * 0.08,
            budgetMin,
            budgetMax: budgetMin + faker.number.int({ min: 200, max: 2000 }),
            budgetMinMinor: budgetMin * 100,
            budgetMaxMinor:
              (budgetMin + faker.number.int({ min: 200, max: 2000 })) * 100,
            status,
            // Geçmiş iş detayları — tamamlanan ilanlarda fotoğraf + ön foto
            photos: faker.helpers.maybe(
              () =>
                completionPhotoUrls(
                  `req-${i}`,
                  faker.number.int({ min: 1, max: 3 }),
                ),
              { probability: 0.4 },
            ),
            completionPhotos: isCompleted
              ? completionPhotoUrls(
                  `comp-${i}`,
                  faker.number.int({ min: 2, max: 4 }),
                )
              : null,
            createdAt,
          } as Partial<Job>),
        );
      }

      // ── 8. Jobs (kind='offer') — Usta hizmet ilanları ─────────────────────
      const offerTitles = [
        'Profesyonel {cat} Hizmeti',
        'Acil {cat} — 7/24',
        'Garantili {cat} — Faturalı',
        'Hızlı {cat} Servisi',
        'Uzman {cat} — Memnuniyet Garantili',
        '{cat} — Hafta Sonu Müsait',
      ];
      for (const w of workers) {
        // %60 worker'ın 1-2 hizmet ilanı olsun
        if (Math.random() < 0.4) continue;
        const cats = w.workerCategories ?? [];
        const offerCnt = faker.number.int({
          min: 1,
          max: Math.min(2, cats.length || 1),
        });
        for (let i = 0; i < offerCnt; i++) {
          const cat = cats[i] ?? faker.helpers.arrayElement(categoryNames);
          const [wLat, wLng] =
            CITY_COORDS[w.city ?? 'Istanbul'] ?? CITY_COORDS.Istanbul;
          const priceMin = faker.number.int({ min: 200, max: 1000 });
          const titleTpl = faker.helpers.arrayElement(offerTitles);
          allJobs.push(
            manager.getRepository(Job).create({
              customerId: w.id, // usta poster
              kind: JobKind.OFFER,
              title: titleTpl.replace('{cat}', cat).slice(0, 200),
              description:
                `${cat} alanında ${faker.number.int({ min: 3, max: 18 })} yıl deneyim. ${w.workerBio ?? ''}`.slice(
                  0,
                  1000,
                ),
              category: cat,
              location: `${w.city ?? 'Istanbul'} bölgesi`.slice(0, 200),
              latitude: wLat + (Math.random() - 0.5) * 0.06,
              longitude: wLng + (Math.random() - 0.5) * 0.06,
              budgetMin: priceMin,
              budgetMax: priceMin + faker.number.int({ min: 200, max: 1500 }),
              budgetMinMinor: priceMin * 100,
              budgetMaxMinor:
                (priceMin + faker.number.int({ min: 200, max: 1500 })) * 100,
              status: JobStatus.OPEN,
              featuredOrder:
                Math.random() < 0.15
                  ? faker.number.int({ min: 1, max: 5 })
                  : null,
            } as Partial<Job>),
          );
        }
      }
      if (allJobs.length) await manager.getRepository(Job).save(allJobs);
      const requestJobs = allJobs.filter((j) => j.kind === JobKind.REQUEST);
      const offerJobs = allJobs.filter((j) => j.kind === JobKind.OFFER);
      created.jobsRequest = requestJobs.length;
      created.jobsOffer = offerJobs.length;

      // ── 9. Offers — Request ilanlarına teklif zinciri ─────────────────────
      const offerRows: Offer[] = [];
      const offerMessages = [
        'Bu işi titizlikle yapabilirim, geçmiş referanslarım mevcut.',
        'Hızlı dönüş yapabilirim, malzeme dahil teklif veriyorum.',
        'Bölgenizdeyim, hafta içi her gün uygunum.',
        'Sigortalı ve faturalı çalışıyorum. Detay için arayabilirsiniz.',
        'Yarın sabah keşfe gelebilirim, fiyat sonra netleşir.',
        '10+ yıl tecrübeyle profesyonel hizmet veriyorum.',
      ];
      for (const job of requestJobs) {
        if (workers.length === 0) break;
        if (job.status === JobStatus.CANCELLED) continue;
        // Her request ilanına 1-4 teklif gelsin
        const bidders = faker.helpers.arrayElements(
          workers.filter((w) => w.id !== job.customerId),
          faker.number.int({
            min: 1,
            max: Math.min(4, workers.length - 1),
          }),
        );
        let hasAccepted = false;
        for (const bidder of bidders) {
          const priceMin = faker.number.int({
            min: Math.max(100, job.budgetMin ?? 200),
            max: job.budgetMax ?? 1000,
          });
          let status: OfferStatus;
          if (job.status === JobStatus.COMPLETED && !hasAccepted) {
            status = OfferStatus.ACCEPTED;
            hasAccepted = true;
          } else if (job.status === JobStatus.IN_PROGRESS && !hasAccepted) {
            status = OfferStatus.ACCEPTED;
            hasAccepted = true;
          } else {
            status = faker.helpers.weightedArrayElement([
              { weight: 50, value: OfferStatus.PENDING },
              { weight: 25, value: OfferStatus.REJECTED },
              { weight: 15, value: OfferStatus.WITHDRAWN },
              { weight: 10, value: OfferStatus.COUNTERED },
            ]);
          }
          offerRows.push(
            manager.getRepository(Offer).create({
              jobId: job.id,
              userId: bidder.id,
              price: priceMin,
              priceMinor: priceMin * 100,
              message: faker.helpers.arrayElement(offerMessages),
              status,
            } as Partial<Offer>),
          );
        }
      }
      if (offerRows.length) await manager.getRepository(Offer).save(offerRows);
      created.offers = offerRows.length;

      // ── 10. Job Questions + Replies ───────────────────────────────────────
      const questionTexts = [
        'Malzemeleri siz mi getireceksiniz?',
        'Hafta sonu da müsait misiniz?',
        'Şehir dışı için ek ücret alıyor musunuz?',
        'Ne kadar sürede tamamlanır?',
        'Garanti süresi ne kadar?',
        'Faturalı çalışıyor musunuz?',
        'Önce keşif yapıp fiyat verebilir misiniz?',
        'Sigortalı çalışıyor musunuz?',
      ];
      const replyTexts = [
        'Evet, malzeme dahil teklif veriyorum.',
        'Hafta sonu da müsaitim, en uygun saatte gelirim.',
        'Şehir dışı için yol ücreti ekliyorum.',
        'Yaklaşık 2-3 saatte tamamlarım.',
        '1 yıl işçilik garantisi veriyorum.',
        'Faturalı ve sigortalı çalışıyorum.',
        'Keşif ücretsiz, randevu için yazın.',
        'Detaylı bilgi için telefon görüşmesi yapalım.',
      ];
      const questions: JobQuestion[] = [];
      const replies: JobQuestionReply[] = [];
      for (const job of allJobs) {
        if (Math.random() < 0.5) continue; // %50 ilana soru gelir
        const qCount = faker.number.int({ min: 1, max: 3 });
        const askers = faker.helpers.arrayElements(
          users.filter((u) => u.id !== job.customerId),
          Math.min(qCount, users.length - 1),
        );
        for (const asker of askers) {
          const q = manager.getRepository(JobQuestion).create({
            jobId: job.id,
            userId: asker.id,
            text: faker.helpers.arrayElement(questionTexts),
          } as Partial<JobQuestion>);
          questions.push(q);
        }
      }
      if (questions.length) {
        await manager.getRepository(JobQuestion).save(questions);
        // %75 soruya yanıt gelir — ilan sahibi cevaplar
        for (const q of questions) {
          if (Math.random() < 0.25) continue;
          const job = allJobs.find((j) => j.id === q.jobId);
          if (!job) continue;
          replies.push(
            manager.getRepository(JobQuestionReply).create({
              questionId: q.id,
              userId: job.customerId, // ilan sahibi (request → müşteri, offer → usta)
              text: faker.helpers.arrayElement(replyTexts),
            } as Partial<JobQuestionReply>),
          );
        }
        if (replies.length)
          await manager.getRepository(JobQuestionReply).save(replies);
      }
      created.questions = questions.length;
      created.replies = replies.length;

      return created;
    });
  }

  async wipeAndPopulate(
    count: number,
  ): Promise<{ wiped: WipeCounts; created: CreateCounts }> {
    return this.dataSource.transaction(async () => {
      const wiped = await this.wipeAll();
      const created = await this.populate(count);
      return { wiped, created };
    });
  }

  /**
   * SMTP tanılama — env'deki SMTP creds ile 587/465/25 kombinasyonlarını sırayla
   * dener (TLS cert doğrulaması KAPALI), her birinde verify + gerçek gönderim yapar.
   * Hangi config'in çalıştığını ve hataları döndürür. ALLOW_SEED-gated.
   */
  async emailDiag(to: string): Promise<{
    host: string;
    user: string;
    from: string;
    passSet: boolean;
    attempts: Array<{
      port: number;
      secure: boolean;
      ok: boolean;
      error?: string;
    }>;
  }> {
    const host = process.env.SMTP_HOST || '';
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';
    const from = process.env.EMAIL_FROM || `Yapgitsin <${user}>`;
    const combos: Array<{ port: number; secure: boolean }> = [
      { port: 587, secure: false },
      { port: 465, secure: true },
      { port: 25, secure: false },
    ];
    const attempts: Array<{
      port: number;
      secure: boolean;
      ok: boolean;
      error?: string;
    }> = [];
    for (const c of combos) {
      const t = nodemailer.createTransport({
        host,
        port: c.port,
        secure: c.secure,
        auth: user && pass ? { user, pass } : undefined,
        connectionTimeout: 12000,
        greetingTimeout: 8000,
        tls: { rejectUnauthorized: false },
      });
      try {
        await t.verify();
        await t.sendMail({
          from,
          to,
          subject: 'Yapgitsin SMTP diag',
          text: `SMTP diag ${c.port}/${c.secure} — ${new Date().toISOString()}`,
        });
        attempts.push({ port: c.port, secure: c.secure, ok: true });
      } catch (e) {
        attempts.push({
          port: c.port,
          secure: c.secure,
          ok: false,
          error: String((e as Error).message).slice(0, 200),
        });
      }
    }
    return { host, user, from, passSet: !!pass, attempts };
  }

  /** Admin/test only — top up a user's token balance by amountMinor (kuruş). */
  async creditTokens(
    email: string,
    amountMinor: number,
  ): Promise<
    | { email: string; newBalanceMinor: number; addedMinor: number }
    | { error: string }
  > {
    const user = await this.dataSource
      .getRepository('User')
      .findOne({ where: { email } });
    if (!user) return { error: `user ${email} not found` };
    const current =
      (user as { tokenBalanceMinor?: number }).tokenBalanceMinor ?? 0;
    const next = current + Math.max(0, amountMinor);
    await this.dataSource.getRepository('User').update(
      { email },
      {
        tokenBalanceMinor: next,
        tokenBalance: Math.floor(next / 100),
      },
    );
    return {
      email,
      addedMinor: amountMinor,
      newBalanceMinor: next,
    };
  }
}
