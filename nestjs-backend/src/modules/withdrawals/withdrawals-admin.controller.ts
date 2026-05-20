import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../../common/guards/admin.guard';
import { WithdrawalsService } from './withdrawals.service';
import { UpdateWithdrawalStatusDto } from './dto/update-status.dto';
import { WithdrawalStatus } from './withdrawal-request.entity';

@Controller('admin/withdrawals')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class WithdrawalsAdminController {
  constructor(private readonly service: WithdrawalsService) {}

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const statusFilter =
      status &&
      Object.values(WithdrawalStatus).includes(status as WithdrawalStatus)
        ? (status as WithdrawalStatus)
        : undefined;
    return this.service.listForAdmin(
      statusFilter,
      Number(page) || 1,
      Number(limit) || 50,
    );
  }

  @Patch(':id')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateWithdrawalStatusDto,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const adminId = req.user.id as string;
    return this.service.updateStatus(adminId, id, dto);
  }
}
