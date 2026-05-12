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
import { SmsModule } from '../sms/sms.module';
import { getJwtSigningSecret } from './jwt-secrets';

@Module({
  imports: [
    TypeOrmModule.forFeature([PasswordResetToken, EmailVerificationToken, SmsOtp]),
    SmsModule,
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      // Signing always uses the current key (JWT_SECRET). Dual-secret verify
      // for API auth tokens lives in JwtStrategy (see jwt-secrets.ts).
      useFactory: () => ({ secret: getJwtSigningSecret() }),
    }),
  ],
  providers: [AuthService, JwtStrategy, TwoFactorService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
