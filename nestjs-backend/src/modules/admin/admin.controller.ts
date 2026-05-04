import { Controller, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CategoriesService } from '../categories/categories.service';
import { Category } from '../categories/category.entity';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly categoriesService: CategoriesService,
  ) {}

  @Get('stats')
  getStats() {
    return this.adminService.getDashboardStats();
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
    return this.adminService.setJobFeaturedOrder(id, body.featuredOrder ?? null);
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
    return this.adminService.setServiceRequestFeaturedOrder(id, body.featuredOrder ?? null);
  }

  @Get('categories')
  getCategories() {
    return this.categoriesService.findAll();
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: Partial<Category>) {
    return this.categoriesService.update(id, body);
  }
}
