import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AdminAuditService } from './admin-audit.service';
import { AUDIT_ACTION_KEY } from './audit.decorator';
import type { Request } from 'express';
import type { AuthUser } from '../../common/types/auth.types';

type AuthedRequest = Request & { user?: AuthUser };

/**
 * Phase 182 — captures successful responses on @Audit-annotated admin routes
 * and writes an audit record. Skips when no `@Audit(...)` metadata is present,
 * when no authenticated user is on the request, or on errors (errors flow
 * through unchanged — audit must not mask failures).
 *
 * Captures: actor (req.user.id + email), action, targetId (route param `id`
 * if any), targetType (heuristic from route path), payload (request body),
 * ip, user-agent.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AdminAuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<string | undefined>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );
    if (!action) {
      return next.handle();
    }
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    return next.handle().pipe(
      tap(() => {
        const user = req.user;
        if (!user) return;
        const params = (req.params ?? {}) as Record<string, string>;
        const body = (req.body ?? null) as Record<string, unknown> | null;
        // Heuristic targetType from action prefix (e.g. 'user.suspend' → 'user').
        const targetType = action.includes('.') ? action.split('.')[0] : null;
        void this.auditService.record({
          actor: { id: user.id, email: user.email ?? null },
          action,
          targetType,
          targetId: params.id ?? null,
          payload: body,
          req: { ip: req.ip, headers: req.headers as Record<string, unknown> },
        });
      }),
    );
  }
}
