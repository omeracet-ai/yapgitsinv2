import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';

export class UserSkillsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  skills: string[];
}
