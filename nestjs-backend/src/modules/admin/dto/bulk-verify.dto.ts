import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsUUID,
} from 'class-validator';

export class BulkVerifyDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  userIds: string[];

  @IsBoolean()
  identityVerified: boolean;
}
