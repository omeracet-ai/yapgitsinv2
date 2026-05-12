import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { FcmService } from './fcm.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly svc: NotificationsService,
    private readonly fcm: FcmService,
  ) {}

  @Get()
  getAll(@Request() req: AuthenticatedRequest) {
    return this.svc.getByUser(req.user.id);
  }

  @Get('unread-count')
  unreadCount(@Request() req: AuthenticatedRequest) {
    return this.svc.unreadCount(req.user.id).then((count) => ({ count }));
  }

  @Post('subscribe')
  async subscribe(
    @Request() req: AuthenticatedRequest,
    @Body() body: { token?: string; enabled?: boolean },
  ) {
    if (body.token && typeof body.token !== 'string') {
      throw new BadRequestException('Invalid token');
    }
    await this.svc.updateUserPushSettings(req.user.id, {
      fcmToken: body.token,
      pushNotificationsEnabled: body.enabled ?? true,
    });
    return { ok: true, fcmEnabled: this.fcm.isEnabled() };
  }

  @Patch('read-all')
  readAll(@Request() req: AuthenticatedRequest) {
    return this.svc.markAllRead(req.user.id).then(() => ({ ok: true }));
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.svc.markRead(id, req.user.id).then(() => ({ ok: true }));
  }
}
