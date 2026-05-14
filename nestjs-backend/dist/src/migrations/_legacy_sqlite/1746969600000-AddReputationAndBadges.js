"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddReputationAndBadges1746969600000 = void 0;
const typeorm_1 = require("typeorm");
class AddReputationAndBadges1746969600000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'reputations',
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
                    name: 'userId',
                    type: 'varchar',
                    length: '36',
                    isNullable: false,
                },
                {
                    name: 'type',
                    type: 'varchar',
                    length: '50',
                    isNullable: false,
                },
                {
                    name: 'referenceId',
                    type: 'varchar',
                    length: '36',
                    isNullable: true,
                },
                {
                    name: 'pointsChange',
                    type: 'int',
                    isNullable: false,
                },
                {
                    name: 'previousScore',
                    type: 'int',
                    isNullable: true,
                },
                {
                    name: 'newScore',
                    type: 'int',
                    isNullable: false,
                },
                {
                    name: 'metadata',
                    type: 'json',
                    isNullable: true,
                },
                {
                    name: 'isPublic',
                    type: 'boolean',
                    default: true,
                },
                {
                    name: 'createdAt',
                    type: 'datetime',
                    default: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);
        await queryRunner.createIndex('reputations', new typeorm_1.TableIndex({
            name: 'IDX_reputations_userId_createdAt',
            columnNames: ['userId', 'createdAt'],
        }));
        await queryRunner.createIndex('reputations', new typeorm_1.TableIndex({
            name: 'IDX_reputations_userId_type',
            columnNames: ['userId', 'type'],
        }));
        await queryRunner.createForeignKey('reputations', new typeorm_1.TableForeignKey({
            columnNames: ['userId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
        }));
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'badges',
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
                    name: 'userId',
                    type: 'varchar',
                    length: '36',
                    isNullable: false,
                },
                {
                    name: 'badgeType',
                    type: 'varchar',
                    length: '50',
                    isNullable: false,
                },
                {
                    name: 'displayName',
                    type: 'varchar',
                    length: '100',
                    isNullable: false,
                },
                {
                    name: 'description',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'iconUrl',
                    type: 'varchar',
                    isNullable: true,
                },
                {
                    name: 'color',
                    type: 'varchar',
                    length: '50',
                    default: "'blue'",
                },
                {
                    name: 'rarity',
                    type: 'varchar',
                    length: '50',
                    default: "'common'",
                },
                {
                    name: 'criteria',
                    type: 'json',
                    isNullable: true,
                },
                {
                    name: 'active',
                    type: 'boolean',
                    default: true,
                },
                {
                    name: 'revokedReason',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'awardedAt',
                    type: 'datetime',
                    default: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'revokedAt',
                    type: 'datetime',
                    isNullable: true,
                },
            ],
        }), true);
        await queryRunner.createIndex('badges', new typeorm_1.TableIndex({
            name: 'IDX_badges_userId_badgeType',
            columnNames: ['userId', 'badgeType'],
        }));
        await queryRunner.createIndex('badges', new typeorm_1.TableIndex({
            name: 'IDX_badges_userId_awardedAt',
            columnNames: ['userId', 'awardedAt'],
        }));
        await queryRunner.createForeignKey('badges', new typeorm_1.TableForeignKey({
            columnNames: ['userId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
        }));
    }
    async down(queryRunner) {
        const badgesTable = await queryRunner.getTable('badges');
        if (badgesTable) {
            const fk = badgesTable.foreignKeys.find((k) => k.columnNames[0] === 'userId');
            if (fk)
                await queryRunner.dropForeignKey('badges', fk);
            await queryRunner.dropTable('badges');
        }
        const reputationsTable = await queryRunner.getTable('reputations');
        if (reputationsTable) {
            const fk = reputationsTable.foreignKeys.find((k) => k.columnNames[0] === 'userId');
            if (fk)
                await queryRunner.dropForeignKey('reputations', fk);
            await queryRunner.dropTable('reputations');
        }
    }
}
exports.AddReputationAndBadges1746969600000 = AddReputationAndBadges1746969600000;
//# sourceMappingURL=1746969600000-AddReputationAndBadges.js.map