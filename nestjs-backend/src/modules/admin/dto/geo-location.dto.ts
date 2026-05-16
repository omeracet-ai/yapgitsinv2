import { IsLatitude, IsLongitude, IsNumber } from 'class-validator';

export class GeoLocationDto {
  @IsNumber()
  @IsLatitude()
  latitude: number;

  @IsNumber()
  @IsLongitude()
  longitude: number;
}
