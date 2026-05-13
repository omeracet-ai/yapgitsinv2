import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Request, Response } from 'express';
import type { AuthUser } from './types/auth.types';

/**
 * Global exception filter — captures unhandled exceptions to Sentry
 * (when SENTRY_DSN is set in production), then preserves default
 * NestJS HttpException response behavior.
 *
 * Phase 189/4:
 * - 5xx + unknown → shipped to Sentry with breadcrumbs (method, path, user id).
 * - 4xx user errors → never shipped (signal/noise).
 * - Sensitive fields (auth header, password, tokens) stripped before send.
 */
@Catch()
export class SentryFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { user?: AuthUser }>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Only report 5xx and unknown to Sentry (skip 4xx user errors)
    if (
      process.env.SENTRY_DSN &&
      process.env.NODE_ENV === 'production' &&
      status >= 500
    ) {
      Sentry.withScope((scope) => {
        // Breadcrumb: request method + path (no query/body — may contain PII).
        scope.addBreadcrumb({
          category: 'http',
          message: `${request.method} ${request.path}`,
          level: 'info',
          data: {
            method: request.method,
            path: request.path,
            statusCode: status,
          },
        });
        // User context — only id + role from JWT, never email/phone.
        if (request.user?.id) {
          scope.setUser({
            id: String(request.user.id),
            role: request.user.role,
          });
        }
        scope.setTag('http.status', String(status));
        Sentry.captureException(exception);
      });
    }

    if (isHttp) {
      const res = exception.getResponse();
      response.status(status).json(
        typeof res === 'string' ? { statusCode: status, message: res } : res,
      );
    } else {
      const err = exception as Error;
      this.logger.error(err?.message ?? 'Unknown error', err?.stack);
      response.status(status).json({
        statusCode: status,
        message: 'Internal server error',
      });
    }
  }
}
