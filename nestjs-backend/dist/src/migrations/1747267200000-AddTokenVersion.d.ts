import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddTokenVersion1747267200000 implements MigrationInterface {
    name: string;
    up(qr: QueryRunner): Promise<void>;
    down(qr: QueryRunner): Promise<void>;
}
