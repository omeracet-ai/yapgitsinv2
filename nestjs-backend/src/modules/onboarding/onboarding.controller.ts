import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OnboardingService } from './onboarding.service';
import { OnboardingSlide } from './onboarding-slide.entity';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('onboarding')
@Controller('onboarding-slides')
export class OnboardingController {
  constructor(private readonly svc: OnboardingService) {}

  /** GET /onboarding-slides — Flutter uygulaması için public */
  @Get()
  findActive(): Promise<OnboardingSlide[]> {
    return this.svc.findActive();
  }

  /** GET /onboarding-slides/all — Admin paneli için tüm slides */
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('all')
  findAll(): Promise<OnboardingSlide[]> {
    return this.svc.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() dto: Partial<OnboardingSlide>): Promise<OnboardingSlide> {
    return this.svc.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Patch('reorder')
  reorder(@Body() body: { ids: string[] }): Promise<void> {
    return this.svc.reorder(body.ids);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<OnboardingSlide>,
  ): Promise<OnboardingSlide> {
    return this.svc.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.svc.remove(id);
  }
}
