import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddHotColumnIndexes1747180800000 implements MigrationInterface {
    name: string;
    up(qr: QueryRunner): Promise<void>;
    down(qr: QueryRunner): Promise<void>;
}
