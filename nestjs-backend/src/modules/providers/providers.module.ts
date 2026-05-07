import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvidersService } from './providers.service';
import { Provider } from './provider.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Provider, User])],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
