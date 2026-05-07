import { Controller, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CategoriesService } from '../categories/categories.service';
import { ProvidersService } from '../providers/providers.service';
import { Category } from '../categories/category.entity';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly categoriesService: CategoriesService,
    private readonly providersService: ProvidersService,
  ) {}

  @Get('stats')
  getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('revenue')
  getRevenue() {
    return this.adminService.getRevenue();
  }

  @Get('jobs')
  getRecentJobs(@Query('limit') limit?: string) {
    return this.adminService.getRecentJobs(limit ? Number(limit) : 20);
  }

  @Patch('jobs/:id/featured')
  setJobFeatured(
    @Param('id') id: string,
    @Body() body: { featuredOrder: number | null },
  ) {
    return this.adminService.setJobFeaturedOrder(
      id,
      body.featuredOrder ?? null,
    );
  }

  @Get('users')
  getUsers() {
    return this.adminService.getAllUsers();
  }

  @Patch('users/:id/verify')
  verifyUser(
    @Param('id') id: string,
    @Body() body: { identityVerified: boolean },
  ) {
    return this.adminService.verifyUser(id, body.identityVerified);
  }

  @Get('service-requests')
  getServiceRequests(@Query('limit') limit?: string) {
    return this.adminService.getAllServiceRequests(limit ? Number(limit) : 50);
  }

  @Patch('service-requests/:id/featured')
  setServiceRequestFeatured(
    @Param('id') id: string,
    @Body() body: { featuredOrder: number | null },
  ) {
    return this.adminService.setServiceRequestFeaturedOrder(
      id,
      body.featuredOrder ?? null,
    );
  }

  @Get('categories')
  getCategories() {
    // Admin pasif kategorileri de görsün — pasif sadece public listede gizlensin
    return this.categoriesService.findAllIncludingInactive();
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: Partial<Category>) {
    return this.categoriesService.update(id, body);
  }

  @Get('providers')
  getProviders() {
    return this.providersService.findAll();
  }

  @Patch('providers/:id/verify')
  verifyProvider(
    @Param('id') id: string,
    @Body() body: { isVerified: boolean },
  ) {
    return this.providersService.setVerified(id, body.isVerified);
  }

  @Patch('providers/:id/featured')
  setProviderFeatured(
    @Param('id') id: string,
    @Body() body: { featuredOrder: number | null },
  ) {
    return this.providersService.setFeaturedOrder(id, body.featuredOrder ?? null);
  }

  /** Set Airtasker-style manual badges on a tasker (user-level). */
  @Patch('users/:id/badges')
  setUserBadges(
    @Param('id') id: string,
    @Body() body: { badges: string[] },
  ) {
    return this.adminService.setUserBadges(id, body.badges);
  }

  /** Set tasker skills (granular tags beyond workerCategories). */
  @Patch('users/:id/skills')
  setUserSkills(
    @Param('id') id: string,
    @Body() body: { skills: string[] },
  ) {
    return this.adminService.setUserSkills(id, body.skills);
  }
}
