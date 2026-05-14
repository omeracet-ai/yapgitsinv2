import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddPerformanceIndexes1746748800000 implements MigrationInterface {
    name: string;
    up(qr: QueryRunner): Promise<void>;
    down(qr: QueryRunner): Promise<void>;
}
