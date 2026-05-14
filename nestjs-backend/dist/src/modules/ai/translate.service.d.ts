import { ConfigService } from '@nestjs/config';
export type TranslateLang = 'tr' | 'en' | 'az';
export declare class TranslateService {
    private readonly configService;
    private readonly client;
    constructor(configService: ConfigService);
    isAvailable(): boolean;
    translate(text: string, targetLang: TranslateLang): Promise<string>;
}
