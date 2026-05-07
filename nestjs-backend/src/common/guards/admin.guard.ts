import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../types/auth.types';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    if (!req.user || req.user.role !== 'admin') {
      throw new ForbiddenException('Admin privileges required');
    }
    return true;
  }
}
