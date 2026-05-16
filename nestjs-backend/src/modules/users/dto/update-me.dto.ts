import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s\-()]{7,20}$/, { message: 'phoneNumber invalid' })
  phoneNumber?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsIn(['male', 'female', 'other'])
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1024)
  identityPhotoUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1024)
  documentPhotoUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1024)
  profileImageUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1024)
  profileVideoUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  workerCategories?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  workerSkills?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  workerBio?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  hourlyRateMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  hourlyRateMax?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  serviceRadiusKm?: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
