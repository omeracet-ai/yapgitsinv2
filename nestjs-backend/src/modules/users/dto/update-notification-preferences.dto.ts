import { IsBoolean, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  booking?: boolean;

  @IsOptional()
  @IsBoolean()
  offer?: boolean;

  @IsOptional()
  @IsBoolean()
  review?: boolean;

  @IsOptional()
  @IsBoolean()
  message?: boolean;

  @IsOptional()
  @IsBoolean()
  system?: boolean;
}

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  preferences?: NotificationPreferencesDto | null;
}
