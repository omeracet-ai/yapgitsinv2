import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
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
    return {
      totalJobs,
      openJobs,
      completedJobs,
      totalUsers,
      totalWorkers,
      verifiedWorkers,
      totalServiceRequests,
      openServiceRequests,
      totalOffers,
      totalBookings,
      totalReviews,
    };
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
        'city',
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
}
