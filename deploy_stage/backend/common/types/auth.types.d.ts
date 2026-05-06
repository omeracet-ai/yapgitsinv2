import { Request } from 'express';
export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
}
export interface AuthUser {
    id: string;
    email: string;
    role: string;
}
export interface AuthenticatedRequest extends Request {
    user: AuthUser;
}
