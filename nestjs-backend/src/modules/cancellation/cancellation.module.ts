import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CancellationPolicy } from './cancellation-policy.entity';
import { CancellationService } from './cancellation.service';
import { CancellationController } from './cancellation.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CancellationPolicy])],
  controllers: [CancellationController],
  providers: [CancellationService],
  exports: [CancellationService],
})
export class CancellationModule {}
