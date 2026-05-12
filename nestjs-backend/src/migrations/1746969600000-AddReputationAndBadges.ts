import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * Phase 165 — Reputation & Badges System
 * Creates reputation audit log and badge tables for worker achievement tracking.
 */
export class AddReputationAndBadges1746969600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create reputations table
    await queryRunner.createTable(
      new Table({
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
      }),
      true,
    );

    // Create indexes on reputations
    await queryRunner.createIndex(
      'reputations',
      new TableIndex({
        name: 'IDX_reputations_userId_createdAt',
        columnNames: ['userId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'reputations',
      new TableIndex({
        name: 'IDX_reputations_userId_type',
        columnNames: ['userId', 'type'],
      }),
    );

    // Create foreign key for reputations -> users
    await queryRunner.createForeignKey(
      'reputations',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create badges table
    await queryRunner.createTable(
      new Table({
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
      }),
      true,
    );

    // Create indexes on badges
    await queryRunner.createIndex(
      'badges',
      new TableIndex({
        name: 'IDX_badges_userId_badgeType',
        columnNames: ['userId', 'badgeType'],
      }),
    );

    await queryRunner.createIndex(
      'badges',
      new TableIndex({
        name: 'IDX_badges_userId_awardedAt',
        columnNames: ['userId', 'awardedAt'],
      }),
    );

    // Create foreign key for badges -> users
    await queryRunner.createForeignKey(
      'badges',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop badges table and its foreign keys
    const badgesTable = await queryRunner.getTable('badges');
    if (badgesTable) {
      const fk = badgesTable.foreignKeys.find((k) => k.columnNames[0] === 'userId');
      if (fk) await queryRunner.dropForeignKey('badges', fk);
      await queryRunner.dropTable('badges');
    }

    // Drop reputations table and its foreign keys
    const reputationsTable = await queryRunner.getTable('reputations');
    if (reputationsTable) {
      const fk = reputationsTable.foreignKeys.find((k) => k.columnNames[0] === 'userId');
      if (fk) await queryRunner.dropForeignKey('reputations', fk);
      await queryRunner.dropTable('reputations');
    }
  }
}
