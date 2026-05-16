import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FcmTokenDto {
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  token?: string;
}
