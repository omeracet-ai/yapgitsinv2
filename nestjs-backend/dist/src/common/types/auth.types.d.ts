import { Request } from 'express';
export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    tenantId?: string | null;
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
