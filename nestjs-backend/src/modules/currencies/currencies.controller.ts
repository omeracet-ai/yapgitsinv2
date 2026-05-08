import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrenciesService } from './currencies.service';
import { User } from '../users/user.entity';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@Controller()
export class CurrenciesController {
  constructor(
    private readonly svc: CurrenciesService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  @Get('currencies')
  list() {
    return this.svc.listActive();
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('users/me/currency')
  async setMyCurrency(
    @Request() req: AuthenticatedRequest,
    @Body() body: { code: string },
  ) {
    const code = (body?.code || '').toUpperCase();
    const cur = await this.svc.findOne(code);
    if (!cur || !cur.isActive) throw new BadRequestException('invalid currency');
    await this.usersRepo.update(req.user.id, { preferredCurrency: code });
    return { preferredCurrency: code };
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('admin/currencies/:code')
  async adminUpdateRate(
    @Param('code') code: string,
    @Body() body: { rateToBase: number },
  ) {
    if (typeof body?.rateToBase !== 'number' || body.rateToBase <= 0) {
      throw new BadRequestException('rateToBase must be a positive number');
    }
    return this.svc.setRate(code, body.rateToBase);
  }
}
