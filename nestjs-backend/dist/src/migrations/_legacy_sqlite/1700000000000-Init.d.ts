import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class Init1700000000000 implements MigrationInterface {
    name: string;
    up(_qr: QueryRunner): Promise<void>;
    down(_qr: QueryRunner): Promise<void>;
}
