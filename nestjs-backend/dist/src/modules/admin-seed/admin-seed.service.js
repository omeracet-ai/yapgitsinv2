"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AdminSeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminSeedService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const faker_1 = require("@faker-js/faker");
const user_entity_1 = require("../users/user.entity");
const booking_entity_1 = require("../bookings/booking.entity");
const payment_escrow_entity_1 = require("../escrow/payment-escrow.entity");
const payment_entity_1 = require("../payments/payment.entity");
const review_entity_1 = require("../reviews/review.entity");
const job_lead_entity_1 = require("../leads/job-lead.entity");
const job_lead_response_entity_1 = require("../leads/job-lead-response.entity");
const category_entity_1 = require("../categories/category.entity");
const SEED_PASSWORD_HASH = '$2b$10$Ne0gxBxRkLW2lXJpFEXM2.0jOXFNwNUM6CG5sM4F7B3jE7Y2yKlxK';
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
let AdminSeedService = AdminSeedService_1 = class AdminSeedService {
    dataSource;
    logger = new common_1.Logger(AdminSeedService_1.name);
    trFaker = new faker_1.Faker({ locale: [faker_1.tr, faker_1.base] });
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async wipeAll() {
        return this.dataSource.transaction(async (manager) => {
            const counts = {
                reviews: 0,
                payments: 0,
                escrows: 0,
                bookings: 0,
                jobLeadResponses: 0,
                jobLeads: 0,
                users: 0,
            };
            const wipeAll = async (entity) => {
                const res = await manager
                    .createQueryBuilder()
                    .delete()
                    .from(entity)
                    .execute();
                return res.affected ?? 0;
            };
            counts.reviews = await wipeAll(review_entity_1.Review);
            counts.payments = await wipeAll(payment_entity_1.Payment);
            counts.escrows = await wipeAll(payment_escrow_entity_1.PaymentEscrow);
            counts.bookings = await wipeAll(booking_entity_1.Booking);
            counts.jobLeadResponses = await wipeAll(job_lead_response_entity_1.JobLeadResponse);
            counts.jobLeads = await wipeAll(job_lead_entity_1.JobLead);
            counts.users = await wipeAll(user_entity_1.User);
            return counts;
        });
    }
    async populate(count) {
        return this.dataSource.transaction(async (manager) => {
            const f = this.trFaker;
            const created = {
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
            const allCategories = await manager.getRepository(category_entity_1.Category).find();
            const categoryNames = allCategories.length
                ? allCategories.map((c) => c.name)
                : ['Temizlik', 'Elektrikci', 'Tesisat', 'Tasimacilik', 'Boya'];
            const users = [];
            const usedPhones = new Set();
            for (let i = 0; i < count; i++) {
                const isWorker = Math.random() < 0.2;
                let phone;
                do {
                    phone = '+9055' + faker_1.faker.string.numeric(8);
                } while (usedPhones.has(phone));
                usedPhones.add(phone);
                const firstName = f.person.firstName();
                const lastName = f.person.lastName();
                const u = manager.getRepository(user_entity_1.User).create({
                    fullName: `${firstName} ${lastName}`.slice(0, 100),
                    phoneNumber: phone,
                    email: faker_1.faker.internet
                        .email({ firstName: firstName.replace(/[^a-zA-Z]/g, ''), lastName: lastName.replace(/[^a-zA-Z]/g, '') })
                        .toLowerCase(),
                    passwordHash: SEED_PASSWORD_HASH,
                    isPhoneVerified: true,
                    emailVerified: true,
                    identityVerified: true,
                    role: user_entity_1.UserRole.USER,
                    tenantId: null,
                    city: TR_CITIES[Math.floor(Math.random() * TR_CITIES.length)],
                });
                if (isWorker) {
                    const cats = faker_1.faker.helpers.arrayElements(categoryNames, faker_1.faker.number.int({ min: 2, max: Math.min(5, categoryNames.length) }));
                    u.workerCategories = cats;
                    u.workerBio = f.lorem.sentences(2);
                    u.hourlyRateMinMinor = faker_1.faker.number.int({ min: 5000, max: 20000 });
                    u.hourlyRateMaxMinor =
                        (u.hourlyRateMinMinor ?? 5000) + faker_1.faker.number.int({ min: 5000, max: 30000 });
                    u.isAvailable = true;
                    created.workers++;
                }
                else {
                    created.customers++;
                }
                users.push(u);
            }
            await manager.getRepository(user_entity_1.User).save(users);
            created.users = users.length;
            const workers = users.filter((u) => u.workerCategories?.length);
            const customers = users.filter((u) => !u.workerCategories?.length);
            const jobLeads = [];
            const leadCount = Math.max(1, Math.floor(count / 5));
            if (customers.length > 0) {
                for (let i = 0; i < leadCount; i++) {
                    const customer = faker_1.faker.helpers.arrayElement(customers);
                    const cat = faker_1.faker.helpers.arrayElement(categoryNames);
                    const budgetMin = faker_1.faker.number.int({ min: 100, max: 800 });
                    const lead = manager.getRepository(job_lead_entity_1.JobLead).create({
                        customerId: customer.id,
                        category: cat,
                        city: customer.city || faker_1.faker.helpers.arrayElement(TR_CITIES),
                        description: `${cat} hizmeti gerekiyor. ${f.lorem.sentence()}`,
                        budgetMin,
                        budgetMax: budgetMin + faker_1.faker.number.int({ min: 100, max: 1200 }),
                        budgetVisible: faker_1.faker.datatype.boolean(),
                        requesterName: customer.fullName,
                        requesterPhone: customer.phoneNumber,
                        requesterEmail: customer.email,
                        preferredContactTime: faker_1.faker.helpers.arrayElement([
                            'today',
                            'this_week',
                            'flexible',
                        ]),
                        status: faker_1.faker.helpers.arrayElement(['open', 'in_progress', 'closed']),
                    });
                    jobLeads.push(lead);
                }
                await manager.getRepository(job_lead_entity_1.JobLead).save(jobLeads);
            }
            created.jobs = jobLeads.length;
            const responses = [];
            if (workers.length > 0) {
                for (const lead of jobLeads) {
                    if (Math.random() > 0.5)
                        continue;
                    const respWorkers = faker_1.faker.helpers.arrayElements(workers, faker_1.faker.number.int({ min: 1, max: Math.min(3, workers.length) }));
                    for (const w of respWorkers) {
                        responses.push(manager.getRepository(job_lead_response_entity_1.JobLeadResponse).create({
                            leadId: lead.id,
                            workerId: w.id,
                            status: faker_1.faker.helpers.arrayElement([
                                'sent_email',
                                'viewed',
                                'contacted',
                                'accepted',
                                'rejected',
                            ]),
                            workerMessage: f.lorem.sentence(),
                            respondedAt: faker_1.faker.date.recent({ days: 30 }),
                        }));
                    }
                }
                if (responses.length)
                    await manager.getRepository(job_lead_response_entity_1.JobLeadResponse).save(responses);
            }
            created.jobResponses = responses.length;
            const bookings = [];
            const escrows = [];
            const payments = [];
            const reviews = [];
            if (workers.length > 0 && customers.length > 0) {
                const bookingCount = Math.max(1, Math.floor(count / 4));
                for (let i = 0; i < bookingCount; i++) {
                    const customer = faker_1.faker.helpers.arrayElement(customers);
                    const worker = faker_1.faker.helpers.arrayElement(workers);
                    const cat = faker_1.faker.helpers.arrayElement(worker.workerCategories ?? categoryNames);
                    const priceMinor = faker_1.faker.number.int({ min: 10000, max: 200000 });
                    const status = faker_1.faker.helpers.arrayElement([
                        booking_entity_1.BookingStatus.CONFIRMED,
                        booking_entity_1.BookingStatus.IN_PROGRESS,
                        booking_entity_1.BookingStatus.COMPLETED,
                        booking_entity_1.BookingStatus.COMPLETED,
                    ]);
                    const booking = manager.getRepository(booking_entity_1.Booking).create({
                        customerId: customer.id,
                        workerId: worker.id,
                        category: cat,
                        description: f.lorem.sentences(2),
                        address: `${customer.city ?? 'Istanbul'} - ${f.location.streetAddress()}`.slice(0, 200),
                        scheduledDate: faker_1.faker.date
                            .soon({ days: 30 })
                            .toISOString()
                            .slice(0, 10),
                        scheduledTime: `${faker_1.faker.number.int({ min: 9, max: 17 })}:00`,
                        status,
                        agreedPriceMinor: priceMinor,
                        agreedPrice: priceMinor / 100,
                    });
                    bookings.push(booking);
                }
                await manager.getRepository(booking_entity_1.Booking).save(bookings);
                for (const b of bookings) {
                    const platformFeeMinor = Math.round((b.agreedPriceMinor ?? 0) * 0.1);
                    const workerPayoutMinor = (b.agreedPriceMinor ?? 0) - platformFeeMinor;
                    const escrowStatus = b.status === booking_entity_1.BookingStatus.COMPLETED ? payment_escrow_entity_1.EscrowStatus.RELEASED : payment_escrow_entity_1.EscrowStatus.HELD;
                    const escrow = manager.getRepository(payment_escrow_entity_1.PaymentEscrow).create({
                        jobId: b.id,
                        offerId: b.id,
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
                        releasedAt: escrowStatus === payment_escrow_entity_1.EscrowStatus.RELEASED ? new Date() : null,
                    });
                    escrows.push(escrow);
                    payments.push(manager.getRepository(payment_entity_1.Payment).create({
                        customerId: b.customerId,
                        workerId: b.workerId,
                        bookingId: b.id,
                        amountMinor: b.agreedPriceMinor ?? 0,
                        currency: 'TRY',
                        status: payment_entity_1.PaymentStatus.COMPLETED,
                        method: payment_entity_1.PaymentMethod.MOCK,
                        completedAt: new Date(),
                        description: `Booking ${b.id} payment`,
                    }));
                    if (b.status === booking_entity_1.BookingStatus.COMPLETED) {
                        reviews.push(manager.getRepository(review_entity_1.Review).create({
                            jobId: null,
                            reviewerId: b.customerId,
                            revieweeId: b.workerId,
                            rating: faker_1.faker.number.int({ min: 3, max: 5 }),
                            comment: f.lorem.sentence(),
                        }));
                    }
                }
                if (escrows.length)
                    await manager.getRepository(payment_escrow_entity_1.PaymentEscrow).save(escrows);
                if (payments.length)
                    await manager.getRepository(payment_entity_1.Payment).save(payments);
                if (reviews.length)
                    await manager.getRepository(review_entity_1.Review).save(reviews);
            }
            created.bookings = bookings.length;
            created.escrows = escrows.length;
            created.payments = payments.length;
            created.reviews = reviews.length;
            return created;
        });
    }
    async wipeAndPopulate(count) {
        return this.dataSource.transaction(async () => {
            const wiped = await this.wipeAll();
            const created = await this.populate(count);
            return { wiped, created };
        });
    }
};
exports.AdminSeedService = AdminSeedService;
exports.AdminSeedService = AdminSeedService = AdminSeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], AdminSeedService);
//# sourceMappingURL=admin-seed.service.js.map