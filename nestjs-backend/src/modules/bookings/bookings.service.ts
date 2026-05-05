import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from './booking.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private repo: Repository<Booking>,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
  ) {}

  /** Randevu oluştur (müşteri → ustaya istek gönderir) */
  async create(
    customerId: string,
    data: {
      workerId: string;
      category: string;
      subCategory?: string;
      description: string;
      address: string;
      scheduledDate: string;
      scheduledTime?: string;
      customerNote?: string;
    },
  ): Promise<Booking> {
    const worker = await this.usersService.findById(data.workerId);
    if (!worker) throw new NotFoundException('Usta bulunamadı');

    const booking = this.repo.create({
      customerId,
      workerId: data.workerId,
      category: data.category,
      subCategory: data.subCategory ?? null,
      description: data.description,
      address: data.address,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime ?? null,
      customerNote: data.customerNote ?? null,
      status: BookingStatus.PENDING,
    });
    const saved = await this.repo.save(booking);

    // Ustaya bildirim
    const customer = await this.usersService.findById(customerId);
    await this.notificationsService.send({
      userId: data.workerId,
      type: NotificationType.BOOKING_REQUEST,
      title: '📅 Yeni Randevu İsteği',
      body: `${customer?.fullName ?? 'Bir müşteri'} sizi ${data.category} için ${data.scheduledDate} tarihine randevu istedi.`,
      refId: saved.id,
    });

    return saved;
  }

  /** Randevu durumunu güncelle */
  async updateStatus(
    id: string,
    actorId: string,
    status: BookingStatus,
    note?: string,
  ): Promise<Booking> {
    const booking = await this.repo.findOne({
      where: { id },
      relations: ['customer', 'worker'],
    });
    if (!booking) throw new NotFoundException('Randevu bulunamadı');

    // Yetki: usta onaylayabilir/reddedebilir; müşteri iptal edebilir
    const isWorker = booking.workerId === actorId;
    const isCustomer = booking.customerId === actorId;
    if (!isWorker && !isCustomer)
      throw new ForbiddenException('Yetkisiz işlem');

    const old = booking.status;
    booking.status = status;
    if (note) {
      if (isWorker) booking.workerNote = note;
      if (isCustomer) booking.customerNote = note;
    }
    const saved = await this.repo.save(booking);

    // Bildirimler
    await this._notifyStatusChange(saved, old, isWorker);

    // İstatistik güncelleme
    if (status === BookingStatus.COMPLETED) {
      await this.usersService.bumpStat(booking.customerId, 'asCustomerSuccess');
      await this.usersService.bumpStat(booking.workerId, 'asWorkerSuccess');
      await this.usersService.recalcReputation(booking.customerId);
      await this.usersService.recalcReputation(booking.workerId);
    }
    if (status === BookingStatus.CANCELLED) {
      if (old !== BookingStatus.PENDING) {
        // Onaylanmış randevu iptal → başarısız say
        await this.usersService.bumpStat(booking.customerId, 'asCustomerFail');
        await this.usersService.bumpStat(booking.workerId, 'asWorkerFail');
        await this.usersService.recalcReputation(booking.customerId);
        await this.usersService.recalcReputation(booking.workerId);
      }
    }

    return saved;
  }

  /** Müşterinin randevuları */
  async findByCustomer(customerId: string, page = 1, limit = 20) {
    const [data, total] = await this.repo.findAndCount({
      where: { customerId },
      relations: ['worker'],
      order: { scheduledDate: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /** Ustanın randevuları */
  async findByWorker(workerId: string, page = 1, limit = 20) {
    const [data, total] = await this.repo.findAndCount({
      where: { workerId },
      relations: ['customer'],
      order: { scheduledDate: 'ASC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /** Tek randevu detayı */
  async findOne(id: string, actorId: string): Promise<Booking> {
    const b = await this.repo.findOne({
      where: { id },
      relations: ['customer', 'worker'],
    });
    if (!b) throw new NotFoundException('Randevu bulunamadı');
    if (b.customerId !== actorId && b.workerId !== actorId)
      throw new ForbiddenException('Yetkisiz işlem');
    return b;
  }

  private async _notifyStatusChange(
    b: Booking,
    _old: BookingStatus,
    isWorker: boolean,
  ) {
    if (b.status === BookingStatus.CONFIRMED) {
      await this.notificationsService.send({
        userId: b.customerId,
        type: NotificationType.BOOKING_CONFIRMED,
        title: '✅ Randevunuz Onaylandı',
        body: `${b.worker?.fullName ?? 'Usta'} randevunuzu onayladı. Tarih: ${b.scheduledDate}`,
        refId: b.id,
      });
    }
    if (b.status === BookingStatus.CANCELLED) {
      const notifyId = isWorker ? b.customerId : b.workerId;
      const actor = isWorker ? b.worker?.fullName : b.customer?.fullName;
      await this.notificationsService.send({
        userId: notifyId,
        type: NotificationType.BOOKING_CANCELLED,
        title: '❌ Randevu İptal Edildi',
        body: `${actor ?? 'Taraf'} randevuyu iptal etti.`,
        refId: b.id,
      });
    }
    if (b.status === BookingStatus.COMPLETED) {
      await this.notificationsService.send({
        userId: b.customerId,
        type: NotificationType.BOOKING_COMPLETED,
        title: '🎉 İş Tamamlandı',
        body: `${b.worker?.fullName ?? 'Usta'} işi tamamlandı olarak işaretledi. Değerlendirme yapmayı unutmayın!`,
        refId: b.id,
      });
    }
  }
}
