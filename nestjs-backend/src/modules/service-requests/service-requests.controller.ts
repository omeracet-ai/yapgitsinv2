import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SkipThrottle } from '@nestjs/throttler';
import { ServiceRequestsService } from './service-requests.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { UpdateServiceRequestDto } from './dto/update-service-request.dto';
import { ApplyServiceRequestDto } from './dto/apply-service-request.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@Controller('service-requests')
export class ServiceRequestsController {
  constructor(private readonly svc: ServiceRequestsService) {}

  /** GET /service-requests?category=Temizlik  — herkese açık */
  @SkipThrottle()
  @Get()
  findAll(@Query('category') category?: string) {
    return this.svc.findAll(category);
  }

  /** GET /service-requests/my  — giriş gerekli */
  @UseGuards(AuthGuard('jwt'))
  @Get('my')
  findMine(@Request() req: AuthenticatedRequest) {
    return this.svc.findByUser(req.user.id);
  }

  /** GET /service-requests/:id */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  /** POST /service-requests  — giriş gerekli */
  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateServiceRequestDto,
  ) {
    return this.svc.create(req.user.id, {
      title: dto.title,
      description: dto.description,
      category: dto.category,
      categoryId: dto.categoryId,
      location: dto.location,
      address: dto.address,
      imageUrl: dto.imageUrl,
      price: dto.price,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
    });
  }

  /** PATCH /service-requests/:id */
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateServiceRequestDto,
  ) {
    return this.svc.update(id, req.user.id, dto);
  }

  /** DELETE /service-requests/:id */
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.svc.remove(id, req.user.id);
  }

  /** POST /service-requests/:id/convert-to-job — SR'i Job'a çevir */
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/convert-to-job')
  convertToJob(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.svc.convertToJob(id, req.user.id);
  }

  // ─── Başvuru (Application) endpointleri ────────────────────────────────

  /** GET /service-requests/applications/my — işçinin kendi başvuruları */
  @UseGuards(AuthGuard('jwt'))
  @Get('applications/my')
  getMyApplications(@Request() req: AuthenticatedRequest) {
    return this.svc.getMyApplications(req.user.id);
  }

  /** POST /service-requests/:id/apply — bir ilana başvur */
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/apply')
  apply(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: ApplyServiceRequestDto,
  ) {
    return this.svc.createApplication(id, req.user.id, dto);
  }

  /** GET /service-requests/:id/applications — ilan sahibi başvuruları görür */
  @UseGuards(AuthGuard('jwt'))
  @Get(':id/applications')
  getApplications(@Param('id') id: string) {
    return this.svc.getApplications(id);
  }

  /** PATCH /service-requests/applications/:appId/status — kabul/red */
  @UseGuards(AuthGuard('jwt'))
  @Patch('applications/:appId/status')
  updateAppStatus(
    @Param('appId') appId: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.svc.updateApplicationStatus(appId, req.user.id, dto.status);
  }
}
