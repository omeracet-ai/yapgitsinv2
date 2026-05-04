import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /** Kullanıcı / işçi girişi */
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) throw new UnauthorizedException('E-posta veya şifre hatalı');
    return this.authService.login(user);
  }

  /** Admin girişi  –  username: "admin"  password: "admin" */
  @Post('admin/login')
  adminLogin(@Body() body: { username: string; password: string }) {
    return this.authService.adminLogin(body.username, body.password);
  }

  /** Yeni kullanıcı / işçi kaydı */
  @Post('register')
  register(@Body() body: any) {
    return this.authService.register(body);
  }
}
