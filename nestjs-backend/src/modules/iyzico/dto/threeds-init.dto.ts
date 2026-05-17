import {
  IsString,
  IsInt,
  IsOptional,
  IsEmail,
  IsIn,
  Matches,
  Min,
  Max,
  MaxLength,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Phase 248-FU (Voldi-fs) — iyzico 3D Secure initialize DTO.
 *
 * Kart bilgileri istemci tarafından gelir; bu endpoint **PCI-DSS scope**'undadır
 * (kartın açık halini görüyoruz). Prod'da TLS zorunlu (Plesk/Nginx), log'lara
 * kart numarası/CVC ASLA yazılmaz (Logger kullanırken whitelist yap).
 */

@ValidatorConstraint({ name: 'luhn', async: false })
class LuhnConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (typeof value !== 'string') return false;
    const digits = value.replace(/\s+/g, '');
    if (!/^\d{12,19}$/.test(digits)) return false;
    let sum = 0;
    let alt = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = parseInt(digits.charAt(i), 10);
      if (alt) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alt = !alt;
    }
    return sum % 10 === 0;
  }
  defaultMessage(_args: ValidationArguments): string {
    return 'cardNumber failed Luhn check';
  }
}

export class ThreeDsInitDto {
  /** Gross amount in TRY (e.g. 199.90). Use string-decimal to avoid float drift. */
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'price must be decimal with up to 2 digits' })
  price!: string;

  /** paidPrice usually == price (no surcharge); kept separate to follow iyzipay schema. */
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'paidPrice must be decimal with up to 2 digits' })
  paidPrice!: string;

  @IsString()
  @IsIn(['TRY'])
  currency!: 'TRY';

  /** Internal reference id (booking/escrow/payment id) — used as basketId + conversationId. */
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  basketId!: string;

  // --- Card ---
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  cardHolderName!: string;

  @Validate(LuhnConstraint)
  cardNumber!: string;

  @Matches(/^(0[1-9]|1[0-2])$/, { message: 'expireMonth must be 01-12' })
  expireMonth!: string;

  @Matches(/^\d{4}$/, { message: 'expireYear must be 4-digit year' })
  expireYear!: string;

  @Matches(/^\d{3,4}$/, { message: 'cvc must be 3 or 4 digits' })
  cvc!: string;

  /** 0 = don't save card, 1 = save card to iyzipay vault */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  registerCard?: number;

  // --- Buyer ---
  @IsString()
  @MaxLength(64)
  buyerId!: string;

  @IsString()
  @MaxLength(60)
  buyerName!: string;

  @IsString()
  @MaxLength(60)
  buyerSurname!: string;

  @IsEmail()
  @MaxLength(128)
  buyerEmail!: string;

  @Matches(/^\+?\d{10,15}$/, { message: 'buyerGsmNumber invalid' })
  buyerGsmNumber!: string;

  /** TR national id (11 digits) — required by iyzipay. */
  @Matches(/^\d{11}$/, { message: 'identityNumber must be 11 digits' })
  identityNumber!: string;

  @IsString()
  @MaxLength(120)
  buyerCity!: string;

  @IsString()
  @MaxLength(60)
  buyerCountry!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  buyerZipCode?: string;

  @IsString()
  @MaxLength(255)
  buyerAddress!: string;

  /** Item name shown on basket / iyzipay reports. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  itemName?: string;
}
