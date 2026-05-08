import { IsEnum, IsString, Length } from 'class-validator';

export enum BroadcastSegment {
  ALL = 'all',
  WORKERS = 'workers',
  CUSTOMERS = 'customers',
  VERIFIED_WORKERS = 'verified_workers',
}

export class BroadcastNotificationDto {
  @IsString()
  @Length(1, 100)
  title: string;

  @IsString()
  @Length(1, 500)
  message: string;

  @IsEnum(BroadcastSegment)
  segment: BroadcastSegment;
}
