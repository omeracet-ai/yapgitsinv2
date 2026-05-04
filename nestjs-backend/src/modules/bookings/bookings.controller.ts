import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BookingsService } from './bookings.service';
import { BookingStatus } from './booking.entity';
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

  /** GET /bookings/my-as-customer */
  @Get('my-as-customer')
  myAsCustomer(@Request() req: AuthenticatedRequest) {
    return this.svc.findByCustomer(req.user.id);
  }

  /** GET /bookings/my-as-worker */
  @Get('my-as-worker')
  myAsWorker(@Request() req: AuthenticatedRequest) {
    return this.svc.findByWorker(req.user.id);
  }

  /** GET /bookings/:id */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.svc.findOne(id, req.user.id);
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
