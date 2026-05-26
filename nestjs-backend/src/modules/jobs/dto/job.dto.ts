import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { JobStatus, JobKind } from '../job.entity';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  category: string;

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
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videos?: string[];
}
