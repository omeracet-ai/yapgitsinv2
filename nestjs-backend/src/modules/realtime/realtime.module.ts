import { Global, Module } from '@nestjs/common';
import { RealtimeService } from './realtime.service';

/**
 * Global because both ChatGateway (writer) and AdminService (reader)
 * depend on the SAME singleton instance. Importing the module twice
 * would create two disjoint in-memory maps.
 */
@Global()
@Module({
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
