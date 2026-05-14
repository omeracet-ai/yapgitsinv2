import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddTenantIdToHotEntities1746835200000 implements MigrationInterface {
    name: string;
    private readonly HOT_TABLES;
    up(qr: QueryRunner): Promise<void>;
    down(qr: QueryRunner): Promise<void>;
}
