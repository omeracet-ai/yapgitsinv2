import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
import {
  EscrowConfirmationService,
  PendingConfirmationRow,
} from './escrow-confirmation.service';

/**
 * Phase 271 — non-:id confirmation endpoints. The main confirmation controller
 * is mounted at `escrow/:id/confirmation`, so user-scoped lists cannot live
 * there (the `:id` segment would swallow `my-pending`).
 */
@Controller('escrow/confirmation')
@UseGuards(AuthGuard('jwt'))
export class EscrowConfirmationListController {
  constructor(private readonly svc: EscrowConfirmationService) {}

  @Get('my-pending')
  myPending(
    @Request() req: AuthenticatedRequest,
  ): Promise<PendingConfirmationRow[]> {
    return this.svc.listMyPending(req.user.id);
  }
}
