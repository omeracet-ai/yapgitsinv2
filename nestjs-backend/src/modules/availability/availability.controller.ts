import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AvailabilityService } from './availability.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly svc: AvailabilityService) {}

  /** GET /availability/me — current user's slots + blackouts */
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@Request() req: AuthenticatedRequest) {
    return this.svc.getCalendar(req.user.id);
  }

  /** POST /availability/me/slots */
  @UseGuards(AuthGuard('jwt'))
  @Post('me/slots')
  addSlot(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      recurringUntil?: string | null;
    },
  ) {
    return this.svc.addSlot(req.user.id, body);
  }

  /** PATCH /availability/me/slots/:id */
  @UseGuards(AuthGuard('jwt'))
  @Patch('me/slots/:id')
  updateSlot(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    body: {
      dayOfWeek?: number;
      startTime?: string;
      endTime?: string;
      recurringUntil?: string | null;
      isActive?: boolean;
    },
  ) {
    return this.svc.updateSlot(id, req.user.id, body);
  }

  /** DELETE /availability/me/slots/:id */
  @UseGuards(AuthGuard('jwt'))
  @Delete('me/slots/:id')
  removeSlot(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.svc.removeSlot(id, req.user.id);
  }

  /** POST /availability/me/blackouts */
  @UseGuards(AuthGuard('jwt'))
  @Post('me/blackouts')
  addBlackout(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: { startDate: string; endDate: string; reason?: string | null },
  ) {
    return this.svc.addBlackout(req.user.id, body);
  }

  /** DELETE /availability/me/blackouts/:id */
  @UseGuards(AuthGuard('jwt'))
  @Delete('me/blackouts/:id')
  removeBlackout(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.svc.removeBlackout(id, req.user.id);
  }

  /** GET /availability/users/:userId — public calendar */
  @Get('users/:userId')
  getUser(@Param('userId') userId: string) {
    return this.svc.getCalendar(userId);
  }

  /** GET /availability/check/:userId?date=ISO */
  @Get('check/:userId')
  async check(
    @Param('userId') userId: string,
    @Query('date') date?: string,
  ): Promise<{ available: boolean; date: string }> {
    if (!date) throw new BadRequestException('date query param required (ISO)');
    const dt = new Date(date);
    if (isNaN(dt.getTime())) {
      throw new BadRequestException('Invalid ISO date');
    }
    const available = await this.svc.isAvailable(userId, dt);
    return { available, date: dt.toISOString() };
  }
}
