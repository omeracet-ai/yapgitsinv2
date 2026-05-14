import { Repository } from 'typeorm';
import { SystemSetting } from './system-setting.entity';
export declare class SystemSettingsService {
    private readonly repo;
    private cache;
    constructor(repo: Repository<SystemSetting>);
    get(key: string, defaultValue: string): Promise<string>;
    set(key: string, value: string, adminId?: string): Promise<SystemSetting>;
    getAll(): Promise<SystemSetting[]>;
    invalidate(key?: string): void;
}
