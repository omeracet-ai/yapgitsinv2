import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';

export class UserBadgesDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  badges: string[];
}

export class BadgeKeyDto {
  @IsString()
  @MaxLength(50)
  badgeKey: string;
}
