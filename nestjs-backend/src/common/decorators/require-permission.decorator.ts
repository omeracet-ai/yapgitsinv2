import { SetMetadata } from '@nestjs/common';
import type { RbacAction, RbacModule } from '../rbac/rbac.config';

export const PERMISSION_METADATA_KEY = 'rbac:permission';

export interface RequiredPermission {
  module: RbacModule;
  action: RbacAction;
}

/**
 * Phase 489 (Faz J/2) — declarative RBAC.
 *
 * Use at class or method level. Method-level wins.
 *
 *   @Controller('admin/jobs')
 *   @RequirePermission('jobs', 'read')
 *   export class AdminJobsController {
 *     @Patch(':id')
 *     @RequirePermission('jobs', 'write')
 *     update() {}
 *   }
 *
 * Backward compatibility: handlers without metadata are NOT gated (existing
 * behaviour preserved). Add the decorator to opt-in.
 */
export const RequirePermission = (
  module: RbacModule,
  action: RbacAction = 'read',
): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSION_METADATA_KEY, {
    module,
    action,
  } satisfies RequiredPermission);
