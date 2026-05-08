import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FavoritesService } from './favorites.service';
import type { SavedJobSearchCriteria } from './saved-job-search.entity';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class FavoritesController {
  constructor(private readonly svc: FavoritesService) {}

  // ---- Favorite providers ----

  @Get('favorites/providers')
  listFavoriteProviders(@Request() req: AuthenticatedRequest) {
    return this.svc.listFavoriteProviders(req.user.id);
  }

  @Post('favorites/providers')
  addFavoriteProvider(
    @Request() req: AuthenticatedRequest,
    @Body() body: { providerId: string; notes?: string | null },
  ) {
    return this.svc.addFavoriteProvider(
      req.user.id,
      body.providerId,
      body.notes,
    );
  }

  @Delete('favorites/providers/:providerId')
  removeFavoriteProvider(
    @Request() req: AuthenticatedRequest,
    @Param('providerId') providerId: string,
  ) {
    return this.svc.removeFavoriteProvider(req.user.id, providerId);
  }

  // ---- Saved job searches ----

  @Get('saved-searches/jobs')
  listSavedSearches(@Request() req: AuthenticatedRequest) {
    return this.svc.listSavedSearches(req.user.id);
  }

  @Post('saved-searches/jobs')
  createSavedSearch(
    @Request() req: AuthenticatedRequest,
    @Body() body: { name: string; criteria: SavedJobSearchCriteria },
  ) {
    return this.svc.createSavedSearch(req.user.id, body.name, body.criteria);
  }

  @Patch('saved-searches/jobs/:id')
  updateSavedSearch(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      criteria?: SavedJobSearchCriteria;
      alertEnabled?: boolean;
    },
  ) {
    return this.svc.updateSavedSearch(req.user.id, id, body);
  }

  @Delete('saved-searches/jobs/:id')
  deleteSavedSearch(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.svc.deleteSavedSearch(req.user.id, id);
  }

  // Phase 83 — alias routes (/saved-searches without /jobs suffix) for the
  // worker-facing "Kayıtlı Aramalarım" UI. Same backing service.

  @Get('saved-searches')
  listSavedSearchesAlias(@Request() req: AuthenticatedRequest) {
    return this.svc.listSavedSearches(req.user.id);
  }

  @Post('saved-searches')
  createSavedSearchAlias(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      name: string;
      criteria: SavedJobSearchCriteria;
      alertEnabled?: boolean;
    },
  ) {
    return this.svc.createSavedSearch(
      req.user.id,
      body.name,
      body.criteria,
      body.alertEnabled,
    );
  }

  @Patch('saved-searches/:id')
  updateSavedSearchAlias(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      criteria?: SavedJobSearchCriteria;
      alertEnabled?: boolean;
    },
  ) {
    return this.svc.updateSavedSearch(req.user.id, id, body);
  }

  @Delete('saved-searches/:id')
  deleteSavedSearchAlias(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.svc.deleteSavedSearch(req.user.id, id);
  }
}
