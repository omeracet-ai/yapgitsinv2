import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';

@Controller('wallet')
@UseGuards(AuthGuard('jwt'))
export class WithdrawalsController {
  constructor(private readonly service: WithdrawalsService) {}

  @Get('balance')
  async balance(@Req() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.id as string;
    const availableMinor = await this.service.getAvailableBalanceMinor(userId);
    return { availableMinor };
  }

  @Post('withdraw')
  async create(@Req() req: any, @Body() dto: CreateWithdrawalDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.id as string;
    return this.service.createRequest(userId, dto);
  }

  @Get('withdrawals')
  async list(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.id as string;
    return this.service.listForWorker(
      userId,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }
}
