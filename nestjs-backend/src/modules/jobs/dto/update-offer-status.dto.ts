import { IsEnum } from 'class-validator';
import { OfferStatus } from '../offer.entity';

/** Phase 244 (Voldi-fs) — PATCH /jobs/:jobId/offers/:id/status body validation. */
export class UpdateOfferStatusDto {
  @IsEnum(OfferStatus)
  status!: OfferStatus;
}
