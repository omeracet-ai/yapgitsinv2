import { IsEnum } from 'class-validator';
import { ApplicationStatus } from '../service-request-application.entity';

/** Phase 244 (Voldi-fs) — PATCH /service-requests/applications/:appId/status body validation. */
export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus)
  status!: ApplicationStatus;
}
