import { UsersService } from '../users/users.service';
export declare class TwoFactorService {
    private readonly usersService;
    constructor(usersService: UsersService);
    setup(userId: string): Promise<{
        secret: string;
        otpauthUrl: string;
        qrDataUrl: string;
    }>;
    enable(userId: string, token: string): Promise<{
        enabled: boolean;
    }>;
    disable(userId: string, token: string): Promise<{
        enabled: boolean;
    }>;
    verify(userId: string, token: string): Promise<boolean>;
}
