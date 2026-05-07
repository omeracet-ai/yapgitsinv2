import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserBlocksService } from './user-blocks.service';
import type { UserReportReason } from './user-report.entity';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class UserBlocksController {
  constructor(private readonly svc: UserBlocksService) {}

  @Post('users/:id/block')
  block(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.svc.block(req.user.id, id);
  }

  @Delete('users/:id/block')
  unblock(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.svc.unblock(req.user.id, id);
  }

  @Get('users/me/blocked')
  listBlocked(@Request() req: AuthenticatedRequest) {
    return this.svc.listBlocked(req.user.id);
  }

  @Post('users/:id/report')
  report(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { reason: UserReportReason; description?: string },
  ) {
    return this.svc.report(req.user.id, id, body.reason, body.description);
  }
}
