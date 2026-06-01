import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { Booking, BookingStatus } from '../bookings/booking.entity';

/**
 * Phase 354 — Live location sharing gateway (prototype, in-memory).
 *
 * Mimari:
 * - Namespace: default (chat gateway ile aynı). Event isimleri "location:*".
 * - Room: `booking:<id>` — yalnız o booking'in customer'ı + worker'ı join edebilir.
 * - Yalnız WORKER `location:update` emit eder (aktif). CUSTOMER pasif dinleyici.
 * - Booking status `confirmed` veya `in_progress` ise join açık;
 *   `completed`/`cancelled` ise reddedilir + room kapanır.
 *
 * Persistence YOK — gerçek prod'da `LocationPing` entity eklenebilir; bu
 * prototip in-memory, KVKK için minimum yüzey.
 *
 * Auth: handshake.auth.userId (mevcut ChatGateway pattern ile aynı).
 */
@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : '*',
  },
})
export class LocationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LocationGateway.name);

  /** socket.id → joined booking room id (cleanup için). */
  private readonly socketBooking = new Map<string, string>();

  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepo: Repository<Booking>,
  ) {}

  private extractUserId(client: Socket): string | null {
    const auth = client.handshake.auth as { userId?: string } | undefined;
    const query = client.handshake.query as { userId?: string } | undefined;
    return auth?.userId ?? query?.userId ?? null;
  }

  handleConnection(client: Socket) {
    this.logger.log(`location client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const room = this.socketBooking.get(client.id);
    if (room) {
      this.socketBooking.delete(client.id);
      this.logger.log(`location client left ${room}: ${client.id}`);
    }
  }

  /**
   * `location:join` { bookingId } — istemci aktif booking'in odasına katılır.
   * Server doğrular: kullanıcı booking'in tarafı + status uygun.
   */
  @SubscribeMessage('location:join')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookingId?: string },
  ): Promise<{ ok: boolean; reason?: string; role?: 'worker' | 'customer' }> {
    const userId = this.extractUserId(client);
    const bookingId = data?.bookingId;
    if (!userId || !bookingId) return { ok: false, reason: 'missing-params' };
    const b = await this.bookingsRepo.findOne({ where: { id: bookingId } });
    if (!b) return { ok: false, reason: 'booking-not-found' };
    const isWorker = b.workerId === userId;
    const isCustomer = b.customerId === userId;
    if (!isWorker && !isCustomer) return { ok: false, reason: 'not-a-party' };
    const allowed: BookingStatus[] = [
      BookingStatus.CONFIRMED,
      BookingStatus.IN_PROGRESS,
    ];
    if (!allowed.includes(b.status)) {
      return { ok: false, reason: 'booking-not-active' };
    }
    const room = `booking:${bookingId}`;
    await client.join(room);
    this.socketBooking.set(client.id, room);
    return { ok: true, role: isWorker ? 'worker' : 'customer' };
  }

  /**
   * `location:update` { bookingId, lat, lng, accuracy?, speed?, heading? }
   * Yalnız WORKER emit edebilir. Customer'lar room'da dinler.
   * Server-side party check + status guard her update'te tekrar yapılır
   * (status değişebilir — booking complete olunca emit yutulur).
   */
  @SubscribeMessage('location:update')
  async onUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      bookingId?: string;
      lat?: number;
      lng?: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
    },
  ): Promise<{ ok: boolean; reason?: string }> {
    const userId = this.extractUserId(client);
    const bookingId = data?.bookingId;
    if (!userId || !bookingId) return { ok: false, reason: 'missing-params' };
    if (
      typeof data.lat !== 'number' ||
      typeof data.lng !== 'number' ||
      Number.isNaN(data.lat) ||
      Number.isNaN(data.lng)
    ) {
      return { ok: false, reason: 'invalid-coords' };
    }
    const b = await this.bookingsRepo.findOne({ where: { id: bookingId } });
    if (!b) return { ok: false, reason: 'booking-not-found' };
    if (b.workerId !== userId) return { ok: false, reason: 'only-worker-emits' };
    const allowed: BookingStatus[] = [
      BookingStatus.CONFIRMED,
      BookingStatus.IN_PROGRESS,
    ];
    if (!allowed.includes(b.status)) {
      return { ok: false, reason: 'booking-not-active' };
    }
    const room = `booking:${bookingId}`;
    const payload = {
      bookingId,
      userId,
      lat: data.lat,
      lng: data.lng,
      accuracy: data.accuracy,
      speed: data.speed,
      heading: data.heading,
      ts: new Date().toISOString(),
    };
    // Broadcast to room (worker'a kendisine de gider — frontend filter eder).
    this.server.to(room).emit('location:peer', payload);
    return { ok: true };
  }

  /** `location:leave` { bookingId } — manuel ayrılış. */
  @SubscribeMessage('location:leave')
  async onLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookingId?: string },
  ): Promise<{ ok: boolean }> {
    const bookingId = data?.bookingId;
    if (!bookingId) return { ok: false };
    const room = `booking:${bookingId}`;
    await client.leave(room);
    this.socketBooking.delete(client.id);
    return { ok: true };
  }
}
