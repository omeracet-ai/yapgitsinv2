import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppService } from './app.service';
import { User } from './modules/users/user.entity';
import { Job } from './modules/jobs/job.entity';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Job) private jobsRepo: Repository<Job>,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Hassas veri içermeyen public sayaçlar — agent-teams 2D simülatörü canlı
   * üye katılımı / iş eklenmesini bu uçtan poll'lar.
   */
  @Get('stats/public')
  async getPublicStats() {
    const [totalUsers, totalJobs, totalWorkers] = await Promise.all([
      this.usersRepo.count(),
      this.jobsRepo.count(),
      this.usersRepo
        .createQueryBuilder('u')
        .where('u.workerCategories IS NOT NULL')
        .andWhere("u.workerCategories != '[]'")
        .andWhere("u.workerCategories != ''")
        .getCount(),
    ]);
    return { totalUsers, totalJobs, totalWorkers, ts: new Date().toISOString() };
  }
}
