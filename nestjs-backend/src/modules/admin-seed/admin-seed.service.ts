import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { faker, Faker, tr, base } from '@faker-js/faker';
import { User, UserRole } from '../users/user.entity';
import { Booking, BookingStatus } from '../bookings/booking.entity';
import { PaymentEscrow, EscrowStatus } from '../escrow/payment-escrow.entity';
import { Payment, PaymentStatus, PaymentMethod } from '../payments/payment.entity';
import { Review } from '../reviews/review.entity';
import { JobLead } from '../leads/job-lead.entity';
import { JobLeadResponse } from '../leads/job-lead-response.entity';
import { Category } from '../categories/category.entity';

export interface WipeCounts {
  reviews: number;
  payments: number;
  escrows: number;
  bookings: number;
  jobLeadResponses: number;
  jobLeads: number;
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
}

// bcrypt hash of "Yapgitsin1234!" (cost 10) — generated once, deterministic
// to avoid 50× bcrypt overhead during populate.
const SEED_PASSWORD_HASH =
  '$2b$10$Ne0gxBxRkLW2lXJpFEXM2.0jOXFNwNUM6CG5sM4F7B3jE7Y2yKlxK';

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

@Injectable()
export class AdminSeedService {
  private readonly logger = new Logger(AdminSeedService.name);
  private readonly trFaker = new Faker({ locale: [tr, base] });

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

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
      counts.payments = await wipeAll(Payment);
      counts.escrows = await wipeAll(PaymentEscrow);
      counts.bookings = await wipeAll(Booking);
      counts.jobLeadResponses = await wipeAll(JobLeadResponse);
      counts.jobLeads = await wipeAll(JobLead);
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
      };

      const allCategories = await manager.getRepository(Category).find();
      const categoryNames = allCategories.length
        ? allCategories.map((c) => c.name)
        : ['Temizlik', 'Elektrikci', 'Tesisat', 'Tasimacilik', 'Boya'];

      // ── 1. Users ───────────────────────────────────────────────────────────
      const users: User[] = [];
      const usedPhones = new Set<string>();
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
        const u = manager.getRepository(User).create({
          fullName: `${firstName} ${lastName}`.slice(0, 100),
          phoneNumber: phone,
          email: faker.internet
            .email({ firstName: firstName.replace(/[^a-zA-Z]/g, ''), lastName: lastName.replace(/[^a-zA-Z]/g, '') })
            .toLowerCase(),
          passwordHash: SEED_PASSWORD_HASH,
          isPhoneVerified: true,
          emailVerified: true,
          identityVerified: true,
          role: UserRole.USER,
          tenantId: null,
          city: TR_CITIES[Math.floor(Math.random() * TR_CITIES.length)],
        });
        if (isWorker) {
          const cats = faker.helpers.arrayElements(
            categoryNames,
            faker.number.int({ min: 2, max: Math.min(5, categoryNames.length) }),
          );
          u.workerCategories = cats;
          u.workerBio = f.lorem.sentences(2);
          u.hourlyRateMinMinor = faker.number.int({ min: 5000, max: 20000 });
          u.hourlyRateMaxMinor =
            (u.hourlyRateMinMinor ?? 5000) + faker.number.int({ min: 5000, max: 30000 });
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
            description: `${cat} hizmeti gerekiyor. ${f.lorem.sentence()}`,
            budgetMin,
            budgetMax: budgetMin + faker.number.int({ min: 100, max: 1200 }),
            budgetVisible: faker.datatype.boolean(),
            requesterName: customer.fullName,
            requesterPhone: customer.phoneNumber,
            requesterEmail: customer.email,
            preferredContactTime: faker.helpers.arrayElement([
              'today',
              'this_week',
              'flexible',
            ]) as 'today' | 'this_week' | 'flexible',
            status: faker.helpers.arrayElement(['open', 'in_progress', 'closed']) as
              | 'open'
              | 'in_progress'
              | 'closed',
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
                workerMessage: f.lorem.sentence(),
                respondedAt: faker.date.recent({ days: 30 }),
              }),
            );
          }
        }
        if (responses.length) await manager.getRepository(JobLeadResponse).save(responses);
      }
      created.jobResponses = responses.length;

      // ── 4. Bookings + Escrow + Payment + Review chain ───────────────────────
      const bookings: Booking[] = [];
      const escrows: PaymentEscrow[] = [];
      const payments: Payment[] = [];
      const reviews: Review[] = [];

      if (workers.length > 0 && customers.length > 0) {
        const bookingCount = Math.max(1, Math.floor(count / 4));
        for (let i = 0; i < bookingCount; i++) {
          const customer = faker.helpers.arrayElement(customers);
          const worker = faker.helpers.arrayElement(workers);
          const cat = faker.helpers.arrayElement(worker.workerCategories ?? categoryNames);
          const priceMinor = faker.number.int({ min: 10000, max: 200000 });
          const status = faker.helpers.arrayElement([
            BookingStatus.CONFIRMED,
            BookingStatus.IN_PROGRESS,
            BookingStatus.COMPLETED,
            BookingStatus.COMPLETED, // weight completed higher
          ]);
          const booking = manager.getRepository(Booking).create({
            customerId: customer.id,
            workerId: worker.id,
            category: cat,
            description: f.lorem.sentences(2),
            address: `${customer.city ?? 'Istanbul'} - ${f.location.streetAddress()}`.slice(0, 200),
            scheduledDate: faker.date
              .soon({ days: 30 })
              .toISOString()
              .slice(0, 10),
            scheduledTime: `${faker.number.int({ min: 9, max: 17 })}:00`,
            status,
            agreedPriceMinor: priceMinor,
            agreedPrice: priceMinor / 100,
          });
          bookings.push(booking);
        }
        await manager.getRepository(Booking).save(bookings);

        for (const b of bookings) {
          const platformFeeMinor = Math.round((b.agreedPriceMinor ?? 0) * 0.1);
          const workerPayoutMinor = (b.agreedPriceMinor ?? 0) - platformFeeMinor;
          const escrowStatus =
            b.status === BookingStatus.COMPLETED ? EscrowStatus.RELEASED : EscrowStatus.HELD;
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
            releasedAt: escrowStatus === EscrowStatus.RELEASED ? new Date() : null,
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
                comment: f.lorem.sentence(),
              }),
            );
          }
        }

        if (escrows.length) await manager.getRepository(PaymentEscrow).save(escrows);
        if (payments.length) await manager.getRepository(Payment).save(payments);
        if (reviews.length) await manager.getRepository(Review).save(reviews);
      }

      created.bookings = bookings.length;
      created.escrows = escrows.length;
      created.payments = payments.length;
      created.reviews = reviews.length;

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
}
