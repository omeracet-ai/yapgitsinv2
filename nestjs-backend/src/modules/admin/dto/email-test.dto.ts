import { IsEmail, MaxLength } from 'class-validator';

export class EmailTestDto {
  @IsEmail()
  @MaxLength(256)
  to!: string;
}
