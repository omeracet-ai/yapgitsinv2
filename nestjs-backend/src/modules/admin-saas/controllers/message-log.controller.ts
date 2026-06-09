import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { MessageLogService } from '../services/message-log.service';

/**
 * M8 — Message Log (read-only viewer, server-side logging happens elsewhere).
 */
@Controller('admin/messages')
@UseGuards(AuthGuard('jwt'), AdminGuard)
@RequirePermission('messages')
export class MessageLogController {
  constructor(private readonly svc: MessageLogService) {}

  @Get('stats')
  stats() {
    return this.svc.stats();
  }

  @Get()
  list(
    @Query('channel') channel?: 'email' | 'fcm' | 'sms' | 'wa',
    @Query('status') status?: 'pending' | 'sent' | 'failed',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.list({
      channel,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 25,
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }
}
