import { SetMetadata } from '@nestjs/common';

/**
 * Phase 182 — mark an admin route for audit logging.
 *
 * Usage:
 *   @Audit('user.suspend')
 *   @Patch('users/:id/suspend')
 *   async suspend(...) { ... }
 *
 * The {@link AuditInterceptor} reads this metadata after a successful response
 * and records an entry via `AdminAuditService.record`. Audit failures are
 * swallowed so they cannot break the original action.
 */
export const AUDIT_ACTION_KEY = 'audit:action';
export const Audit = (action: string) => SetMetadata(AUDIT_ACTION_KEY, action);
