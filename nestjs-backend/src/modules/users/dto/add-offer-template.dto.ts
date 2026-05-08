import { IsString, Length } from 'class-validator';

export class AddOfferTemplateDto {
  @IsString()
  @Length(1, 500)
  text: string;
}
