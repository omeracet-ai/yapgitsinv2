import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BoostService } from './boost.service';
import { BoostType } from './boost.entity';

@ApiTags('boost')
@Controller('boost')
export class BoostController {
  constructor(private readonly svc: BoostService) {}

  @Get('packages')
  packages() {
    return this.svc.getPackages();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('my')
  async my(@Req() req: { user: { id: string } }) {
    return this.svc.getMy(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('purchase')
  async purchase(
    @Req() req: { user: { id: string } },
    @Body() body: { type?: string },
  ) {
    const t = body?.type;
    if (
      t !== BoostType.FEATURED_24H &&
      t !== BoostType.FEATURED_7D &&
      t !== BoostType.TOP_SEARCH_24H
    ) {
      throw new BadRequestException('Geçersiz boost tipi');
    }
    return this.svc.purchase(req.user.id, t as BoostType);
  }
}
