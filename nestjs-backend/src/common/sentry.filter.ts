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
      const body =
        typeof res === 'string' ? { statusCode: status, message: res } : res;
      response.status(status).json(this.normalizeErrorBody(body, status));
    } else {
      const err = exception as Error;
      this.logger.error(err?.message ?? 'Unknown error', err?.stack);
      response.status(status).json({
        statusCode: status,
        message: 'Internal server error',
        error: 'InternalServerError',
        errorCode: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Phase 530 (Voldi-fs) — Standardize HTTP exception response shape with a
   * stable `errorCode` field that clients can switch on for i18n without
   * parsing localized `message` strings.
   *
   * Shape:
   *   {
   *     statusCode: number,
   *     message: string,        // Turkish (legacy clients keep working)
   *     error: string,          // English class name ("Unauthorized", ...)
   *     errorCode: string       // STABLE machine code ("AUTH_INVALID_CREDENTIALS")
   *   }
   *
   * `errorCode` precedence:
   *   1. Caller explicitly set `errorCode` in HttpException response object.
   *   2. Caller set `code` (alias) — promoted to `errorCode`.
   *   3. Fallback derived from `error` field + status (e.g. 401 → AUTH_UNAUTHORIZED,
   *      400 → VALIDATION_FAILED when error === 'Bad Request').
   *
   * Backwards-compatible: all existing fields (message, retryAfter, errors[],
   * etc.) preserved verbatim — we only ADD errorCode/error if missing.
   */
  private normalizeErrorBody(
    body: unknown,
    status: number,
  ): Record<string, unknown> {
    const raw =
      body && typeof body === 'object'
        ? ({ ...(body as Record<string, unknown>) } as Record<string, unknown>)
        : { message: String(body ?? 'Hata'), statusCode: status };

    if (typeof raw.statusCode !== 'number') raw.statusCode = status;

    // Caller alias: `code` → `errorCode`
    if (!raw.errorCode && typeof raw.code === 'string') {
      raw.errorCode = raw.code;
    }

    // Derive `error` (English-ish class name) if missing.
    if (!raw.error || typeof raw.error !== 'string') {
      raw.error = SentryFilter.defaultErrorName(status);
    }

    // Derive stable errorCode if not provided.
    if (!raw.errorCode || typeof raw.errorCode !== 'string') {
      raw.errorCode = SentryFilter.defaultErrorCode(
        status,
        raw.error as string,
      );
    }

    return raw;
  }

  /** Map HTTP status → conventional Nest error name (mirrors built-in exceptions). */
  private static defaultErrorName(status: number): string {
    switch (status) {
      case 400:
        return 'Bad Request';
      case 401:
        return 'Unauthorized';
      case 403:
        return 'Forbidden';
      case 404:
        return 'Not Found';
      case 409:
        return 'Conflict';
      case 422:
        return 'Unprocessable Entity';
      case 423:
        return 'Locked';
      case 429:
        return 'Too Many Requests';
      case 500:
        return 'Internal Server Error';
      case 503:
        return 'Service Unavailable';
      default:
        return status >= 500 ? 'Internal Server Error' : 'Error';
    }
  }

  /**
   * Map HTTP status → stable English machine code. Used as a fallback when
   * the throwing service did not supply a domain-specific `errorCode`. Domain
   * code suffixes (AUTH_INVALID_CREDENTIALS, etc.) MUST be set at throw site
   * — those carry richer meaning than generic AUTH_UNAUTHORIZED.
   */
  private static defaultErrorCode(status: number, errorName: string): string {
    switch (status) {
      case 400:
        // class-validator ValidationPipe → array of constraint messages.
        return errorName === 'Bad Request' ? 'VALIDATION_FAILED' : 'BAD_REQUEST';
      case 401:
        return 'AUTH_UNAUTHORIZED';
      case 403:
        return 'AUTH_FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'UNPROCESSABLE_ENTITY';
      case 423:
        return 'ACCOUNT_LOCKED';
      case 429:
        return 'RATE_LIMITED';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      default:
        return status >= 500 ? 'INTERNAL_ERROR' : 'ERROR';
    }
  }
}
