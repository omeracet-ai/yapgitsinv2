/**
 * Phase 254-Voldi-providers: restore public /providers/* surface backing the
 * Flutter `provider_repository.dart` call sites. Admin still owns mutation
 * authority via /admin/* routes; this controller is read-mostly for the app.
 *
 * NOTE (Müdür): legacy "provider system" was retired in favour of
 * Airtasker-style "every user with workerCategories is a tasker" — these
 * endpoints proxy to that user-driven shape and lazily ensure a `providers`
 * row exists so create/update keep working for documents + bio.
 */
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProvidersService } from './providers.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly svc: ProvidersService) {}

  /** GET /providers — filtered, searchable list (Airtasker tasker directory). */
  @Get()
  async list(
    @Query('search') search?: string,
    @Query('minRating') minRating?: string,
    @Query('minRate') minRate?: string,
    @Query('maxRate') maxRate?: string,
    @Query('verifiedOnly') verifiedOnly?: string,
    @Query('availableOnly') availableOnly?: string,
    @Query('sortBy') sortBy?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('semanticQuery') _semanticQuery?: string,
  ) {
    const num = (v?: string) =>
      v == null || v === '' || isNaN(parseFloat(v)) ? undefined : parseFloat(v);
    const bool = (v?: string) =>
      v === 'true' ? true : v === 'false' ? false : undefined;
    return this.svc.findPublic({
      search: search?.trim() || undefined,
      minRating: num(minRating),
      minRate: num(minRate),
      maxRate: num(maxRate),
      verifiedOnly: bool(verifiedOnly),
      availableOnly: bool(availableOnly),
      sortBy,
      lat: num(lat),
      lng: num(lng),
      radiusKm: num(radiusKm),
    });
  }

  /** GET /providers/by-user/:userId — null-tolerant lookup for "my profile". */
  @Get('by-user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.svc.findByUserIdPublic(userId);
  }

  /** GET /providers/:id/completed-jobs — gallery for profile screen. */
  @Get(':id/completed-jobs')
  async completedJobs(@Param('id') id: string) {
    return this.svc.getCompletedJobsForProvider(id);
  }

  /** GET /providers/:id — single provider full DTO. */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const p = await this.svc.findOnePublic(id);
    if (!p) throw new NotFoundException('Sağlayıcı bulunamadı');
    return p;
  }

  /** POST /providers — upsert current user's provider row (businessName + bio + docs). */
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Body() body: { businessName?: string; bio?: string; documents?: Record<string, string> },
    @Request() req: AuthenticatedRequest,
  ) {
    if (!body?.businessName?.trim()) {
      throw new BadRequestException('businessName zorunludur');
    }
    return this.svc.upsertForUser(req.user.id, {
      businessName: body.businessName.trim(),
      bio: body.bio?.trim() || undefined,
      documents: body.documents,
    });
  }

  /** PATCH /providers/:id — owner-only update (businessName/bio/documents). */
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { businessName?: string; bio?: string; documents?: Record<string, string> },
    @Request() req: AuthenticatedRequest,
  ) {
    const ok = await this.svc.assertOwner(id, req.user.id);
    if (!ok) throw new ForbiddenException('Bu sağlayıcı profilini düzenleme yetkiniz yok');
    return this.svc.updateOwned(id, {
      businessName: body.businessName?.trim(),
      bio: body.bio?.trim(),
      documents: body.documents,
    });
  }
}
