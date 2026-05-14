import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { BookingsService } from './bookings.service';
import { BookingStatus, CancellationReason } from './booking.entity';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@UseGuards(AuthGuard('jwt'))
@Controller('bookings')
export class BookingsController {
  constructor(private readonly svc: BookingsService) {}

  /** POST /bookings — Randevu oluştur */
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      workerId: string;
      category?: string;
      subCategory?: string;
      description?: string;
      address?: string;
      scheduledDate?: string;
      scheduledTime?: string;
      customerNote?: string;
    },
  ) {
    return this.svc.create(req.user.id, {
      workerId: body.workerId ?? '',
      category: body.category ?? '',
      subCategory: body.subCategory,
      description: body.description ?? '',
      address: body.address ?? '',
      scheduledDate: body.scheduledDate ?? '',
      scheduledTime: body.scheduledTime,
      customerNote: body.customerNote,
    });
  }

  /** GET /bookings/export/ics — Phase 207: worker calendar export */
  @Get('export/ics')
  async exportIcs(
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const ics = await this.svc.exportIcs(req.user.id);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="yapgitsin-takvim.ics"');
    res.send(ics);
  }

  /** GET /bookings/my-as-customer?page=1&limit=20 */
  @Get('my-as-customer')
  myAsCustomer(
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findByCustomer(req.user.id, Number(page) || 1, Number(limit) || 20);
  }

  /** GET /bookings/my-as-worker?page=1&limit=20 */
  @Get('my-as-worker')
  myAsWorker(
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findByWorker(req.user.id, Number(page) || 1, Number(limit) || 20);
  }

  /** GET /bookings/:id */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.svc.findOne(id, req.user.id);
  }

  /** POST /bookings/:id/cancel — Phase 128 cancellation + refund policy */
  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { reason: CancellationReason },
  ) {
    return this.svc.cancelBooking(id, req.user.id, body.reason);
  }

  /** PATCH /bookings/:id/status */
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { status: BookingStatus; note?: string },
  ) {
    return this.svc.updateStatus(id, req.user.id, body.status, body.note);
  }
}
