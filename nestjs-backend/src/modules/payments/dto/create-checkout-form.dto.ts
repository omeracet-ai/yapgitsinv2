import {
  IsString,
  IsOptional,
  IsNumberString,
  MaxLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CheckoutFormBuyerDto } from './checkout-form-buyer.dto';

export { CheckoutFormBuyerDto };

export class CreateCheckoutFormDto {
  @IsNumberString()
  @MaxLength(20)
  price!: string;

  @IsNumberString()
  @MaxLength(20)
  paidPrice!: string;

  @IsString()
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'basketId yalnızca harf/rakam/-/_ içerebilir',
  })
  basketId!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CheckoutFormBuyerDto)
  user?: CheckoutFormBuyerDto;
}
