import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, Between, MoreThan } from 'typeorm';
import { Job, JobStatus } from '../jobs/job.entity';
import { User } from '../users/user.entity';
import { ServiceRequest } from '../service-requests/service-request.entity';
import { Offer } from '../jobs/offer.entity';
import { Booking } from '../bookings/booking.entity';
import { Review } from '../reviews/review.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Job) private jobsRepo: Repository<Job>,
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(ServiceRequest)
    private srRepo: Repository<ServiceRequest>,
    @InjectRepository(Offer) private offersRepo: Repository<Offer>,
    @InjectRepository(Booking) private bookingsRepo: Repository<Booking>,
    @InjectRepository(Review) private reviewsRepo: Repository<Review>,
  ) {}

  async getDashboardStats() {
    const [
      totalJobs,
      totalUsers,
      totalServiceRequests,
      openServiceRequests,
      totalWorkers,
      verifiedWorkers,
      totalOffers,
      totalBookings,
      totalReviews,
      openJobs,
      completedJobs,
    ] = await Promise.all([
      this.jobsRepo.count(),
      this.usersRepo.count(),
      this.srRepo.count(),
      this.srRepo.count({ where: { status: 'open' } }),
      this.usersRepo
        .createQueryBuilder('u')
        .where('u.workerCategories IS NOT NULL')
        .andWhere("u.workerCategories != '[]'")
        .andWhere("u.workerCategories != ''")
        .getCount(),
      this.usersRepo
        .createQueryBuilder('u')
        .where('u.identityVerified = :v', { v: true })
        .andWhere('u.workerCategories IS NOT NULL')
        .andWhere("u.workerCategories != '[]'")
        .getCount(),
      this.offersRepo.count(),
      this.bookingsRepo.count(),
      this.reviewsRepo.count(),
      this.jobsRepo.count({ where: { status: JobStatus.OPEN } }),
      this.jobsRepo.count({ where: { status: JobStatus.COMPLETED } }),
    ]);

    const chartData = await this.getChartData();

    return {
      totalJobs,
      openJobs,
      completedJobs,
      totalUsers,
      totalWorkers,
      verifiedWorkers,
      // Aliases for admin panel compatibility
      totalProviders: totalWorkers,
      verifiedProviders: verifiedWorkers,
      totalServiceRequests,
      openServiceRequests,
      totalOffers,
      totalBookings,
      totalReviews,
      chartData,
    };
  }

  async getChartData() {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const jobsPerDay = await Promise.all(
      last7Days.map(async (date) => {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        const count = await this.jobsRepo.count({
          where: { createdAt: Between(date, nextDay) },
        });
        return { date: date.toLocaleDateString('tr-TR'), count };
      }),
    );

    const usersPerDay = await Promise.all(
      last7Days.map(async (date) => {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        const count = await this.usersRepo.count({
          where: { createdAt: Between(date, nextDay) },
        });
        return { date: date.toLocaleDateString('tr-TR'), count };
      }),
    );

    return { jobsPerDay, usersPerDay };
  }

  async getRecentJobs(limit = 20) {
    return this.jobsRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['customer'],
    });
  }

  async getAllUsers() {
    return this.usersRepo.find({
      order: { createdAt: 'DESC' },
      select: [
        'id',
        'fullName',
        'email',
        'phoneNumber',
        'isPhoneVerified',
        'identityVerified',
        'role',
        'city',
        'workerCategories',
        'badges',
        'averageRating',
        'totalReviews',
        'asWorkerTotal',
        'asWorkerSuccess',
        'responseTimeMinutes',
        'createdAt',
      ],
    });
  }

  async getAllServiceRequests(limit = 50) {
    return this.srRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['user'],
    });
  }

  async setServiceRequestFeaturedOrder(
    id: string,
    featuredOrder: number | null,
  ) {
    return this.srRepo.update(id, { featuredOrder });
  }

  async setJobFeaturedOrder(id: string, featuredOrder: number | null) {
    return this.jobsRepo.update(id, { featuredOrder });
  }

  async verifyUser(id: string, identityVerified: boolean) {
    return this.usersRepo.update(id, { identityVerified });
  }

  /**
   * Set Airtasker-style manual badges (insurance/premium/partner/verified_business).
   * Computed badges (top_rated, reliable, etc.) are derived at read-time and not stored.
   */
  async setUserBadges(id: string, badges: string[]) {
    const allowed = ['insurance', 'premium', 'partner', 'verified_business'];
    const filtered = (badges ?? []).filter((b) => allowed.includes(b));
    await this.usersRepo.update(id, { badges: filtered });
    return { id, badges: filtered };
  }
}
