import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogPost } from './blog-post.entity';
import { BlogService } from './blog.service';
import { BlogPublicController, BlogAdminController } from './blog.controller';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([BlogPost]), AdminAuditModule],
  controllers: [BlogPublicController, BlogAdminController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
