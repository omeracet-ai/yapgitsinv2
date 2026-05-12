import {
  IsString,
  IsOptional,
  IsEmail,
  Length,
  Matches,
  IsIn,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
} from 'class-validator';

export class CreateJobLeadDto {
  @IsString()
  @Length(1, 100)
  category: string;

  @IsString()
  @Length(1, 100)
  city: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMax?: number;

  @IsOptional()
  @IsBoolean()
  budgetVisible?: boolean;

  @IsString()
  @Length(2, 100)
  requesterName: string;

  @IsString()
  @Matches(/^(\+90|0)?5\d{9}$/, { message: 'Geçerli bir telefon numarası giriniz' })
  requesterPhone: string;

  @IsEmail()
  requesterEmail: string;

  @IsOptional()
  @IsIn(['today', 'this_week', 'flexible'])
  preferredContactTime?: 'today' | 'this_week' | 'flexible';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
