import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class BulkFeatureDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  userIds: string[];

  @ValidateIf((_o, v) => v !== null)
  @IsOptional()
  @IsIn([1, 2, 3, null])
  featuredOrder: 1 | 2 | 3 | null;
}

export class BulkUnfeatureDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  userIds: string[];
}
