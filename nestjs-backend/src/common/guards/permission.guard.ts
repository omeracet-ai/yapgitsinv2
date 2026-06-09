import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthUser } from '../types/auth.types';
import {
  hasPermission,
  resolveRbacRole,
  type RbacAction,
} from '../rbac/rbac.config';
import {
  PERMISSION_METADATA_KEY,
  RequiredPermission,
} from '../decorators/require-permission.decorator';

/**
 * Phase 489 (Faz J/2) — RBAC enforcement.
 *
 * Resolution order:
 *  1. If @RequirePermission is on the METHOD → use it as-is.
 *  2. Else if @RequirePermission is on the CLASS → use its module, but DERIVE
 *     the action from the HTTP verb (GET → read, DELETE → delete, others → write).
 *     This lets a single class-level annotation gate the whole controller with
 *     verb-aware strictness — analysts can hit GET but POST/DELETE require
 *     write/delete permissions.
 *  3. No metadata → allow (backward compat; legacy controllers stay open).
 *
 * Assumes upstream AuthGuard('jwt') + AdminGuard already populated req.user
 * with role='admin' (non-admin requests are blocked before this guard).
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const methodMeta = this.reflector.get<RequiredPermission | undefined>(
      PERMISSION_METADATA_KEY,
      context.getHandler(),
    );
    const classMeta = this.reflector.get<RequiredPermission | undefined>(
      PERMISSION_METADATA_KEY,
      context.getClass(),
    );
    if (!methodMeta && !classMeta) return true;

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser & { adminRole?: string | null } }>();
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin privileges required');
    }

    const required: RequiredPermission = methodMeta ?? {
      module: classMeta!.module,
      action: this.actionForMethod(req.method),
    };

    const role = resolveRbacRole(user.adminRole);
    if (!hasPermission(role, required.module, required.action)) {
      throw new ForbiddenException(
        `Permission denied: ${required.module}:${required.action} (role=${role})`,
      );
    }
    return true;
  }

  private actionForMethod(method: string): RbacAction {
    const m = (method || 'GET').toUpperCase();
    if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return 'read';
    if (m === 'DELETE') return 'delete';
    return 'write';
  }
}
