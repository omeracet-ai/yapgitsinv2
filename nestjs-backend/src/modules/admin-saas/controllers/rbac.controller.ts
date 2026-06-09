import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import {
  getMatrixSnapshot,
  resolveRbacRole,
  RBAC_ROLES,
} from '../../../common/rbac/rbac.config';
import { User } from '../../users/user.entity';
import type { AuthUser } from '../../../common/types/auth.types';

/**
 * Phase 489 (Faz J/2) — RBAC Matrix.
 *
 * Live enforcement: every endpoint decorated with @RequirePermission is gated
 * by PermissionGuard. Legacy admins (User.adminRole NULL) are treated as
 * super_admin so the existing single-admin model keeps working until roles
 * are assigned via PATCH /admin/rbac/users/:id.
 */
@Controller('admin/rbac')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class RbacController {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  @Get('matrix')
  matrix() {
    const snap = getMatrixSnapshot();
    return {
      ...snap,
      note:
        'Faz J/2 ile RBAC enforcement aktif. NULL adminRole = legacy super_admin. PATCH /admin/rbac/users/:id ile rol ata.',
    };
  }

  @Get('current')
  current(@Req() req: Request & { user?: AuthUser & { adminRole?: string | null } }) {
    const user = req.user;
    const role = resolveRbacRole(user?.adminRole);
    return {
      role,
      legacy: !user?.adminRole,
      assignableRoles: RBAC_ROLES,
    };
  }

  /** List admin users + their adminRole for the UI assignment screen. */
  @Get('users')
  @RequirePermission('system-settings', 'read')
  async users() {
    const admins = await this.usersRepo.find({
      where: { role: 'admin' as never },
      select: ['id', 'email', 'fullName', 'adminRole'],
    });
    return {
      data: admins.map((a) => ({
        id: a.id,
        email: a.email,
        fullName: a.fullName,
        adminRole: a.adminRole,
        effectiveRole: resolveRbacRole(a.adminRole),
      })),
    };
  }

  /** Assign or clear an admin's RBAC sub-role. */
  @Patch('users/:id')
  @RequirePermission('system-settings', 'write')
  async assign(
    @Param('id') id: string,
    @Body() body: { adminRole?: string | null },
  ) {
    const next =
      body.adminRole && (RBAC_ROLES as readonly string[]).includes(body.adminRole)
        ? body.adminRole
        : null;
    await this.usersRepo.update(id, { adminRole: next });
    return { id, adminRole: next, effectiveRole: resolveRbacRole(next) };
  }
}
