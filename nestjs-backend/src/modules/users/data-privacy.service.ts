import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import {
  DataDeletionRequest,
  DataDeletionRequestStatus,
} from './data-deletion-request.entity';
import { Job } from '../jobs/job.entity';
import { Offer } from '../jobs/offer.entity';
import { Review } from '../reviews/review.entity';
import { Booking } from '../bookings/booking.entity';
import { Notification } from '../notifications/notification.entity';
import { ChatMessage } from '../chat/chat-message.entity';
import { TokenTransaction } from '../tokens/token-transaction.entity';

@Injectable()
export class DataPrivacyService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(DataDeletionRequest)
    private deletionRequests: Repository<DataDeletionRequest>,
    @InjectRepository(Job) private jobs: Repository<Job>,
    @InjectRepository(Offer) private offers: Repository<Offer>,
    @InjectRepository(Review) private reviews: Repository<Review>,
    @InjectRepository(Booking) private bookings: Repository<Booking>,
    @InjectRepository(Notification) private notifications: Repository<Notification>,
    @InjectRepository(ChatMessage) private chatMessages: Repository<ChatMessage>,
    @InjectRepository(TokenTransaction)
    private tokenTransactions: Repository<TokenTransaction>,
  ) {}

  /** KVKK Madde 11 — kullanıcının tüm verilerini JSON olarak döndür */
  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    const { passwordHash: _ph, ...profile } = user as { passwordHash?: string } & User;

    const [
      jobs,
      offers,
      reviewsWritten,
      reviewsReceived,
      bookingsAsCustomer,
      bookingsAsWorker,
      notifications,
      chatHistory,
      tokenTransactions,
    ] = await Promise.all([
      this.jobs.find({ where: { customerId: userId } }),
      this.offers.find({ where: { userId } }),
      this.reviews.find({ where: { reviewerId: userId } }),
      this.reviews.find({ where: { revieweeId: userId } }),
      this.bookings.find({ where: { customerId: userId } }),
      this.bookings.find({ where: { workerId: userId } }),
      this.notifications.find({ where: { userId } }),
      this.chatMessages.find({ where: { from: userId } }),
      this.tokenTransactions.find({ where: { userId } }),
    ]);

    return {
      meta: {
        exportedAt: new Date().toISOString(),
        kvkkArticle: 'Madde 11',
        userId,
      },
      profile,
      jobs,
      offers,
      reviews: { written: reviewsWritten, received: reviewsReceived },
      bookings: { asCustomer: bookingsAsCustomer, asWorker: bookingsAsWorker },
      notifications,
      chatHistory,
      tokenTransactions,
      portfolioPhotos: Array.isArray(user.portfolioPhotos)
        ? user.portfolioPhotos
        : [],
    };
  }

  async createDeletionRequest(
    userId: string,
    reason: string | null,
  ): Promise<DataDeletionRequest> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    const existing = await this.deletionRequests.findOne({
      where: { userId, status: DataDeletionRequestStatus.PENDING },
    });
    if (existing) {
      throw new BadRequestException('Bekleyen bir silme talebiniz zaten var');
    }
    const now = new Date();
    const scheduled = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const req = this.deletionRequests.create({
      userId,
      reason: reason ?? null,
      status: DataDeletionRequestStatus.PENDING,
      scheduledDeletionAt: scheduled,
    });
    return this.deletionRequests.save(req);
  }

  async listDeletionRequests(
    status?: DataDeletionRequestStatus,
  ): Promise<DataDeletionRequest[]> {
    return this.deletionRequests.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async moderateDeletionRequest(
    id: string,
    action: 'approve' | 'reject',
    adminId: string,
    adminNote?: string,
  ): Promise<DataDeletionRequest> {
    const req = await this.deletionRequests.findOne({ where: { id } });
    if (!req) throw new NotFoundException('Silme talebi bulunamadı');
    if (req.status !== DataDeletionRequestStatus.PENDING) {
      throw new BadRequestException('Sadece bekleyen talepler işlenebilir');
    }
    req.status =
      action === 'approve'
        ? DataDeletionRequestStatus.APPROVED
        : DataDeletionRequestStatus.REJECTED;
    req.processedAt = new Date();
    req.processedBy = adminId;
    req.adminNote = adminNote ?? null;
    return this.deletionRequests.save(req);
  }

  async executeDeletion(
    id: string,
    adminId: string,
  ): Promise<{ deleted: true; userId: string }> {
    const req = await this.deletionRequests.findOne({ where: { id } });
    if (!req) throw new NotFoundException('Silme talebi bulunamadı');
    if (req.status !== DataDeletionRequestStatus.APPROVED) {
      throw new BadRequestException('Sadece onaylanmış talepler silinebilir');
    }
    const user = await this.users.findOne({ where: { id: req.userId } });
    if (user) {
      await this.users.remove(user);
    }
    req.status = DataDeletionRequestStatus.COMPLETED;
    req.processedAt = new Date();
    req.processedBy = adminId;
    await this.deletionRequests.save(req);
    return { deleted: true, userId: req.userId };
  }
}
