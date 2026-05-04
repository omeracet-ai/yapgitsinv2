import { Controller, Get, Patch, Param, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';

@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  getAll(@Request() req: any) {
    return this.svc.getByUser(req.user.id);
  }

  @Get('unread-count')
  unreadCount(@Request() req: any) {
    return this.svc.unreadCount(req.user.id).then(count => ({ count }));
  }

  @Patch('read-all')
  readAll(@Request() req: any) {
    return this.svc.markAllRead(req.user.id).then(() => ({ ok: true }));
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Request() req: any) {
    return this.svc.markRead(id, req.user.id).then(() => ({ ok: true }));
  }
}
