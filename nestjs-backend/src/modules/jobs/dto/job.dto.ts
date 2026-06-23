import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsBoolean,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { JobStatus, JobKind } from '../job.entity';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

export class CreateJobDto {
  @SanitizeHtml()
  @IsString()
  @IsNotEmpty()
  title: string;

  @SanitizeHtml()
  @IsString()
  @IsNotEmpty()
  description: string;

  // category server-side enum/whitelist'e karşı kontrol edilir ama yine de
  // güvenli olsun.
  @SanitizeHtml()
  @IsString()
  @IsNotEmpty()
  category: string;

  @SanitizeHtml()
  @IsString()
  @IsNotEmpty()
  location: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMax?: number;

  @IsOptional()
  @IsString()
  dueDate?: string;

  /** Phase 463 (hatalar.txt #9) — Çoklu tarih (YYYY-MM-DD dizisi).
   * Doluysa dueDate ilk elemana mirror edilir. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dueDates?: string[];

  /** Phase 464 (hatalar.txt #17) — Taslak ilan (yayında değil). */
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;

  /** Phase 266 — HH:MM 24h saat. */
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'dueTime HH:MM formatında olmalı',
  })
  dueTime?: string;

  /** Phase 266 — "Tüm saatler" toggle. */
  @IsOptional()
  @IsBoolean()
  dueAnyTime?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videos?: string[];

  // Phase 152 — konum pin'i (LocationPickerScreen'den)
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  locationApprox?: boolean;

  @IsOptional()
  @IsString()
  locationSource?: string;

  /**
   * Phase Two-Sided — ilan türü. Default 'request' (müşteri talep).
   * 'offer' için kullanıcının workerCategories'i dolu olmak zorunda
   * (validation jobs.service.ts'de).
   */
  @IsOptional()
  @IsEnum(JobKind)
  kind?: JobKind;

  /** Phase 265 — özel hedef usta (varsa ekstra kredi düşer). */
  @IsOptional()
  @IsString()
  targetWorkerId?: string;

  /** Phase 265 — saat esnekliği: 'flexible' | 'specific' | 'urgent' */
  @IsOptional()
  @IsString()
  scheduleFlexibility?: 'flexible' | 'specific' | 'urgent';
}

export class UpdateJobDto {
  @IsOptional()
  @SanitizeHtml()
  @IsString()
  title?: string;

  @IsOptional()
  @SanitizeHtml()
  @IsString()
  description?: string;

  @IsOptional()
  @SanitizeHtml()
  @IsString()
  location?: string;

  // Phase 496 — bunlar eksik olduğu için frontend "Kaydet" → 400 "property
  // X should not exist" alıyordu (ValidationPipe forbidNonWhitelisted).
  @IsOptional()
  @SanitizeHtml()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMax?: number;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsString()
  dueDate?: string;

  /** Phase 463 (hatalar.txt #9) — Çoklu tarih (UpdateJob). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dueDates?: string[];

  /** Phase 266 — HH:MM 24h saat. */
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'dueTime HH:MM formatında olmalı',
  })
  dueTime?: string;

  /** Phase 266 — "Tüm saatler" toggle. */
  @IsOptional()
  @IsBoolean()
  dueAnyTime?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videos?: string[];

  /** Phase 505 — Taslaktan canlıya geçiş için PATCH endpoint'inde de
   * `isDraft` gönderilmeli; whitelist'te yoksa ValidationPipe 400 verir
   * (Phase 496 dersi). */
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}
