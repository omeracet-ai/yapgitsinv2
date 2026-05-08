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
import { ReportUserDto } from './dto/report-user.dto';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class UserBlocksController {
  constructor(private readonly svc: UserBlocksService) {}

  // ── Phase 46 routes ────────────────────────────────────────────────────────
  @Post('users/me/blocks/:userId')
  async blockMe(
    @Request() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    await this.svc.block(req.user.id, userId);
    return { blocked: true, blockedId: userId };
  }

  @Delete('users/me/blocks/:userId')
  unblockMe(
    @Request() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    return this.svc.unblockIdempotent(req.user.id, userId);
  }

  @Get('users/me/blocks')
  listMyBlocks(@Request() req: AuthenticatedRequest) {
    return this.svc.listBlockedPaged(req.user.id);
  }

  @Post('users/:userId/report')
  async reportUser(
    @Request() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() body: ReportUserDto,
  ) {
    const r = await this.svc.report(
      req.user.id,
      userId,
      body.reason as UserReportReason,
      body.description,
    );
    return { id: r.id, status: r.status };
  }

  // ── Legacy routes (backwards compat) ───────────────────────────────────────
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

}
