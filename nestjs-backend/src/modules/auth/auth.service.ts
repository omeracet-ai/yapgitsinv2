import { Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../users/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    const adminEmail = 'admin@hizmet.app';
    const existing = await this.usersService.findByEmail(adminEmail);
    if (!existing) {
      const passwordHash = await bcrypt.hash('admin', 10);
      await this.usersService.create({
        fullName: 'Admin',
        email: adminEmail,
        phoneNumber: '05000000000',
        passwordHash,
        role: UserRole.ADMIN,
        isPhoneVerified: true,
      });
    }
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && user.passwordHash && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async adminLogin(username: string, password: string) {
    const email = username === 'admin' ? 'admin@hizmet.app' : username;
    const user  = await this.usersService.findByEmail(email);
    if (!user || user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Geçersiz admin bilgileri');
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Geçersiz admin bilgileri');
    }
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '8h' }),
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
    };
  }

  async register(userData: any) {
    const existingByEmail = userData.email
      ? await this.usersService.findByEmail(userData.email)
      : null;
    if (existingByEmail) throw new UnauthorizedException('Bu e-posta zaten kayıtlı');

    const existingByPhone = await this.usersService.findByPhone(userData.phoneNumber);
    if (existingByPhone) throw new UnauthorizedException('Bu telefon numarası zaten kayıtlı');

    const passwordHash = await bcrypt.hash(userData.password, await bcrypt.genSalt());

    const newUser = await this.usersService.create({
      fullName:    userData.fullName ?? 'Kullanıcı',
      email:       userData.email,
      phoneNumber: userData.phoneNumber,
      passwordHash,
      birthDate:   userData.birthDate,
      gender:      userData.gender,
      city:        userData.city,
      district:    userData.district,
      address:     userData.address,
      role:        UserRole.USER,
    });

    const { passwordHash: _, ...result } = newUser;
    const payload = { email: result.email, sub: result.id, role: result.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: result,
    };
  }
}
