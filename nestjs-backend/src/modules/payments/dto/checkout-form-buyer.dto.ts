import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';

export class CheckoutFormBuyerDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  surname?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(256)
  email?: string;
}
