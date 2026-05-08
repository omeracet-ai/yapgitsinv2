import { IsUUID, IsInt, Min, Max, IsString, MaxLength, IsOptional } from 'class-validator';

export class GiftTokensDto {
  @IsUUID()
  recipientId: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
