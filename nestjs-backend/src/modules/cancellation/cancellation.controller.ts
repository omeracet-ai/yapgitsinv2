import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CancellationService } from './cancellation.service';
import type {
  CreatePolicyDto,
  UpdatePolicyDto,
} from './cancellation.service';

@Controller('admin/cancellation-policies')
@UseGuards(AuthGuard('jwt'))
export class CancellationController {
  constructor(private readonly svc: CancellationService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Post()
  create(@Body() dto: CreatePolicyDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePolicyDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}
