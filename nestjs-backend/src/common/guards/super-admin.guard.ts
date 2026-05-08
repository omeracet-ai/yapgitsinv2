import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../types/auth.types';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    if (!req.user || req.user.role !== 'super_admin') {
      throw new ForbiddenException('Super-admin privileges required');
    }
    return true;
  }
}
