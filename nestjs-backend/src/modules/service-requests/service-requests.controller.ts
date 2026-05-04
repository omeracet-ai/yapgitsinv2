import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ServiceRequestsService } from './service-requests.service';

@Controller('service-requests')
export class ServiceRequestsController {
  constructor(private readonly svc: ServiceRequestsService) {}

  /** GET /service-requests?category=Temizlik  — herkese açık */
  @Get()
  findAll(@Query('category') category?: string) {
    return this.svc.findAll(category);
  }

  /** GET /service-requests/my  — giriş gerekli */
  @UseGuards(AuthGuard('jwt'))
  @Get('my')
  findMine(@Request() req: any) {
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
  create(@Request() req: any, @Body() body: any) {
    return this.svc.create(req.user.id, {
      title:       body.title,
      description: body.description,
      category:    body.category,
      categoryId:  body.categoryId,
      location:    body.location,
      address:     body.address,
      imageUrl:    body.imageUrl,
      price:       body.price,
    });
  }

  /** PATCH /service-requests/:id */
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Request() req: any, @Body() body: any) {
    return this.svc.update(id, req.user.id, body);
  }

  /** DELETE /service-requests/:id */
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.svc.remove(id, req.user.id);
  }

  // ─── Başvuru (Application) endpointleri ────────────────────────────────

  /** GET /service-requests/applications/my — işçinin kendi başvuruları */
  @UseGuards(AuthGuard('jwt'))
  @Get('applications/my')
  getMyApplications(@Request() req: any) {
    return this.svc.getMyApplications(req.user.id);
  }

  /** POST /service-requests/:id/apply — bir ilana başvur */
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/apply')
  apply(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { message?: string; price?: number },
  ) {
    return this.svc.createApplication(id, req.user.id, body);
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
    @Request() req: any,
    @Body() body: { status: 'accepted' | 'rejected' },
  ) {
    return this.svc.updateApplicationStatus(appId, req.user.id, body.status as any);
  }
}
