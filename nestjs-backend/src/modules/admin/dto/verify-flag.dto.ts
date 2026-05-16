import { IsBoolean } from 'class-validator';

export class VerifyFlagDto {
  @IsBoolean()
  verified: boolean;
}

export class IdentityVerifiedDto {
  @IsBoolean()
  identityVerified: boolean;
}

export class IsVerifiedDto {
  @IsBoolean()
  isVerified: boolean;
}
