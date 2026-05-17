import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { TwoFactorService } from './two-factor.service';
import { PasswordResetToken } from './password-reset-token.entity';
import { EmailVerificationToken } from './email-verification-token.entity';
import { SmsOtp } from './sms-otp.entity';
import { IpOtpLockout } from './ip-otp-lockout.entity';
import { SmsModule } from '../sms/sms.module';
import { getJwtSigningSecret } from './jwt-secrets';
import { IpOtpLockoutCleanupService } from './ip-otp-lockout-cleanup.service';
import { EmailValidatorService } from './email-validator.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PasswordResetToken,
      EmailVerificationToken,
      SmsOtp,
      IpOtpLockout,
    ]),
    SmsModule,
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      // Signing always uses the current key (JWT_SECRET). Dual-secret verify
      // for API auth tokens lives in JwtStrategy (see jwt-secrets.ts).
      useFactory: () => ({ secret: getJwtSigningSecret() }),
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    TwoFactorService,
    IpOtpLockoutCleanupService,
    EmailValidatorService,
  ],
  controllers: [AuthController],
  exports: [AuthService, IpOtpLockoutCleanupService],
})
export class AuthModule {}
