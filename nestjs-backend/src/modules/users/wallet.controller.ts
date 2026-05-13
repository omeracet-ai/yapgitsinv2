import { Controller, Get, Header, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { WalletService } from './wallet.service';

/**
 * Phase 180 — Customer wallet PDF export.
 *
 * GET /users/me/wallet.pdf → application/pdf with the authenticated user's
 * payments + escrow history for the last 12 months. Audit-trail / tax friendly.
 */
@Controller('users/me')
export class WalletController {
  constructor(private readonly svc: WalletService) {}

  @Get('wallet.pdf')
  @UseGuards(AuthGuard('jwt'))
  @Header('Content-Type', 'application/pdf')
  @Header(
    'Content-Disposition',
    'attachment; filename="yapgitsin-wallet.pdf"',
  )
  async getPdf(@Req() req: any, @Res() res: Response): Promise<void> {
    const userId = req.user.id;
    const buffer = await this.svc.generatePdf(userId);
    res.send(buffer);
  }
}
