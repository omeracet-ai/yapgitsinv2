import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Response } from 'express';

/**
 * Global exception filter — captures unhandled exceptions to Sentry
 * (when SENTRY_DSN is set in production), then preserves default
 * NestJS HttpException response behavior.
 */
@Catch()
export class SentryFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

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
      Sentry.captureException(exception);
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
