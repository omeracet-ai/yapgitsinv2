import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

/** Phase 244 (Voldi-fs) — POST /service-requests/:id/apply body validation. */
export class ApplyServiceRequestDto {
  @IsOptional()
  @SanitizeHtml()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
