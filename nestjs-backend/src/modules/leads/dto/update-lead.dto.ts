import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class UpdateLeadDto {
  @IsOptional()
  @IsIn(['new', 'contacted', 'converted', 'spam'])
  status?: 'new' | 'contacted' | 'converted' | 'spam';

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;
}
