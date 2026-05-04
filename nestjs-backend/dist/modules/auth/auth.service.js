"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("../users/users.service");
const jwt_1 = require("@nestjs/jwt");
const user_entity_1 = require("../users/user.entity");
const bcrypt = __importStar(require("bcrypt"));
let AuthService = class AuthService {
    usersService;
    jwtService;
    constructor(usersService, jwtService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
    }
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
                role: user_entity_1.UserRole.ADMIN,
                isPhoneVerified: true,
            });
        }
    }
    async validateUser(email, pass) {
        const user = await this.usersService.findByEmail(email);
        if (user && user.passwordHash && (await bcrypt.compare(pass, user.passwordHash))) {
            const { passwordHash, ...result } = user;
            return result;
        }
        return null;
    }
    async login(user) {
        const payload = { email: user.email, sub: user.id, role: user.role };
        return {
            access_token: this.jwtService.sign(payload),
            user,
        };
    }
    async adminLogin(username, password) {
        const email = username === 'admin' ? 'admin@hizmet.app' : username;
        const user = await this.usersService.findByEmail(email);
        if (!user || user.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.UnauthorizedException('Geçersiz admin bilgileri');
        }
        if (!(await bcrypt.compare(password, user.passwordHash))) {
            throw new common_1.UnauthorizedException('Geçersiz admin bilgileri');
        }
        const payload = { email: user.email, sub: user.id, role: user.role };
        return {
            access_token: this.jwtService.sign(payload, { expiresIn: '8h' }),
            user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
        };
    }
    async register(userData) {
        const existingByEmail = userData.email
            ? await this.usersService.findByEmail(userData.email)
            : null;
        if (existingByEmail)
            throw new common_1.UnauthorizedException('Bu e-posta zaten kayıtlı');
        const existingByPhone = await this.usersService.findByPhone(userData.phoneNumber);
        if (existingByPhone)
            throw new common_1.UnauthorizedException('Bu telefon numarası zaten kayıtlı');
        const passwordHash = await bcrypt.hash(userData.password, await bcrypt.genSalt());
        const newUser = await this.usersService.create({
            fullName: userData.fullName ?? 'Kullanıcı',
            email: userData.email,
            phoneNumber: userData.phoneNumber,
            passwordHash,
            birthDate: userData.birthDate,
            gender: userData.gender,
            city: userData.city,
            district: userData.district,
            address: userData.address,
            role: user_entity_1.UserRole.USER,
        });
        const { passwordHash: _, ...result } = newUser;
        const payload = { email: result.email, sub: result.id, role: result.role };
        return {
            access_token: this.jwtService.sign(payload),
            user: result,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map