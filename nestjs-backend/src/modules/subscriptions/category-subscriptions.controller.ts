import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CategorySubscriptionsService } from './category-subscriptions.service';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions/category')
@UseGuards(AuthGuard('jwt'))
export class CategorySubscriptionsController {
  constructor(private readonly svc: CategorySubscriptionsService) {}

  @Get()
  async list(@Req() req: { user: { id: string } }) {
    const subs = await this.svc.listMine(req.user.id);
    return subs.map((s) => ({
      id: s.id,
      category: s.category,
      city: s.city,
      alertEnabled: s.alertEnabled,
      createdAt: s.createdAt,
    }));
  }

  @Post()
  async create(
    @Req() req: { user: { id: string } },
    @Body() body: { category: string; city?: string },
  ) {
    const s = await this.svc.create(req.user.id, body.category, body.city);
    return {
      id: s.id,
      category: s.category,
      city: s.city,
      alertEnabled: s.alertEnabled,
      createdAt: s.createdAt,
    };
  }

  @Delete(':id')
  async remove(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.svc.remove(id, req.user.id);
  }
}
