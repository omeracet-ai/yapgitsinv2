import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BookingEscrowService } from './booking-escrow.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
import { Booking } from '../bookings/booking.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

@Controller('escrow')
@UseGuards(AuthGuard('jwt'))
export class BookingEscrowController {
  constructor(
    private readonly svc: BookingEscrowService,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  /** POST /escrow/hold — customer hold tokens for a booking */
  @Post('hold')
  async hold(
    @Body() body: { bookingId: string; amount: number },
    @Request() req: AuthenticatedRequest,
  ) {
    if (!body?.bookingId || !body?.amount) {
      throw new BadRequestException('bookingId ve amount zorunlu');
    }
    const booking = await this.bookingRepo.findOne({
      where: { id: body.bookingId },
    });
    if (!booking) throw new NotFoundException('Booking bulunamadı');
    if (booking.customerId !== req.user.id) {
      throw new ForbiddenException('Sadece müşteri hold çağırabilir');
    }
    return this.svc.hold(
      body.bookingId,
      booking.customerId,
      booking.workerId,
      body.amount,
    );
  }

  /** POST /escrow/release/:bookingId — customer releases to worker */
  @Post('release/:bookingId')
  release(
    @Param('bookingId') bookingId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.svc.release(bookingId, req.user.id);
  }

  /** GET /escrow/booking/:bookingId — query escrow status */
  @Get('booking/:bookingId')
  async getByBooking(
    @Param('bookingId') bookingId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const escrow = await this.svc.getByBooking(bookingId, req.user.id);
    if (!escrow) throw new NotFoundException('Escrow yok');
    return escrow;
  }
}
