import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  // Phase 160 — multi-tenant. Absent on tokens issued before this claim existed
  // (treated as the default tenant -> null). User.tenantId is a tenant UUID or null.
  tenantId?: string | null;
  // Phase P191/4 — token revocation. Absent on legacy tokens minted before this
  // claim existed (treated as 0). Compared against User.tokenVersion in JwtStrategy.
  tokenVersion?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  tenantId?: string | null;
  city?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}
