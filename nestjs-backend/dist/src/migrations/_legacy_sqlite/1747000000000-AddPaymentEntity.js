"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddPaymentEntity1747000000000 = void 0;
const typeorm_1 = require("typeorm");
class AddPaymentEntity1747000000000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'payments',
            columns: [
                {
                    name: 'id',
                    type: 'varchar',
                    length: '36',
                    isPrimary: true,
                },
                {
                    name: 'tenantId',
                    type: 'varchar',
                    length: '36',
                    isNullable: true,
                },
                {
                    name: 'customerId',
                    type: 'varchar',
                    length: '36',
                    isNullable: false,
                },
                {
                    name: 'workerId',
                    type: 'varchar',
                    length: '36',
                    isNullable: false,
                },
                {
                    name: 'bookingId',
                    type: 'varchar',
                    length: '36',
                    isNullable: true,
                },
                {
                    name: 'amountMinor',
                    type: 'integer',
                    isNullable: false,
                },
                {
                    name: 'currency',
                    type: 'varchar',
                    length: '3',
                    default: "'TRY'",
                },
                {
                    name: 'status',
                    type: 'varchar',
                    default: "'pending'",
                },
                {
                    name: 'method',
                    type: 'varchar',
                    default: "'card'",
                },
                {
                    name: 'externalTransactionId',
                    type: 'varchar',
                    length: '255',
                    isNullable: true,
                },
                {
                    name: 'providerRequestId',
                    type: 'varchar',
                    length: '255',
                    isNullable: true,
                },
                {
                    name: 'paymentIntentId',
                    type: 'varchar',
                    length: '255',
                    isNullable: true,
                },
                {
                    name: 'refundId',
                    type: 'varchar',
                    length: '255',
                    isNullable: true,
                },
                {
                    name: 'refundedAmountMinor',
                    type: 'integer',
                    isNullable: true,
                },
                {
                    name: 'feeMinor',
                    type: 'integer',
                    isNullable: true,
                },
                {
                    name: 'netAmountMinor',
                    type: 'integer',
                    isNullable: true,
                },
                {
                    name: 'errorMessage',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'description',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'idempotencyKey',
                    type: 'varchar',
                    length: '255',
                    isNullable: true,
                    isUnique: true,
                },
                {
                    name: 'receiptEmail',
                    type: 'varchar',
                    length: '255',
                    isNullable: true,
                },
                {
                    name: 'metadata',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'createdAt',
                    type: 'datetime',
                    default: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'updatedAt',
                    type: 'datetime',
                    default: 'CURRENT_TIMESTAMP',
                    onUpdate: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'completedAt',
                    type: 'timestamp',
                    isNullable: true,
                },
            ],
        }), true);
        await queryRunner.createIndex('payments', new typeorm_1.TableIndex({
            name: 'IDX_payments_customerId_createdAt',
            columnNames: ['customerId', 'createdAt'],
        }));
        await queryRunner.createIndex('payments', new typeorm_1.TableIndex({
            name: 'IDX_payments_workerId_createdAt',
            columnNames: ['workerId', 'createdAt'],
        }));
        await queryRunner.createIndex('payments', new typeorm_1.TableIndex({
            name: 'IDX_payments_status',
            columnNames: ['status'],
        }));
        await queryRunner.createIndex('payments', new typeorm_1.TableIndex({
            name: 'IDX_payments_externalTransactionId',
            columnNames: ['externalTransactionId'],
        }));
        await queryRunner.createForeignKey('payments', new typeorm_1.TableForeignKey({
            columnNames: ['customerId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
        }));
        await queryRunner.createForeignKey('payments', new typeorm_1.TableForeignKey({
            columnNames: ['workerId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
        }));
        await queryRunner.createForeignKey('payments', new typeorm_1.TableForeignKey({
            columnNames: ['bookingId'],
            referencedTableName: 'bookings',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropTable('payments');
    }
}
exports.AddPaymentEntity1747000000000 = AddPaymentEntity1747000000000;
//# sourceMappingURL=1747000000000-AddPaymentEntity.js.map