import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { AdminAuditService } from './admin-audit.service';
export declare class AuditInterceptor implements NestInterceptor {
    private readonly reflector;
    private readonly auditService;
    constructor(reflector: Reflector, auditService: AdminAuditService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
}
