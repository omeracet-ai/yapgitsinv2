import { IsString, Length } from 'class-validator';

export class AddMessageTemplateDto {
  @IsString()
  @Length(1, 500)
  text: string;
}
