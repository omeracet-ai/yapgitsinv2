import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { StatementsService } from './statements.service';

@Controller('statements')
@UseGuards(AuthGuard('jwt'))
export class StatementsController {
  constructor(private readonly statementsService: StatementsService) {}

  private parsePeriod(yearRaw?: string, monthRaw?: string): { year: number; month: number } {
    const now = new Date();
    const year = yearRaw ? Number(yearRaw) : now.getFullYear();
    const month = monthRaw ? Number(monthRaw) : now.getMonth() + 1;
    if (!Number.isInteger(year) || year < 2020 || year > 2030) {
      throw new BadRequestException('year must be between 2020 and 2030');
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException('month must be between 1 and 12');
    }
    return { year, month };
  }

  @Get('me')
  async getMine(
    @Req() req: { user: { userId: string; sub?: string; id?: string } },
    @Query('year') yearRaw?: string,
    @Query('month') monthRaw?: string,
  ) {
    const { year, month } = this.parsePeriod(yearRaw, monthRaw);
    const userId = req.user.userId ?? req.user.sub ?? req.user.id!;
    return this.statementsService.getMonthly(userId, year, month);
  }

  @Get('me/download')
  async downloadMine(
    @Req() req: { user: { userId: string; sub?: string; id?: string } },
    @Res({ passthrough: false }) res: Response,
    @Query('year') yearRaw?: string,
    @Query('month') monthRaw?: string,
  ) {
    const { year, month } = this.parsePeriod(yearRaw, monthRaw);
    const userId = req.user.userId ?? req.user.sub ?? req.user.id!;
    const csv = await this.statementsService.getMonthlyCsv(userId, year, month);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set(
      'Content-Disposition',
      `attachment; filename="beyan-${year}-${String(month).padStart(2, '0')}.csv"`,
    );
    res.send(csv);
  }
}
