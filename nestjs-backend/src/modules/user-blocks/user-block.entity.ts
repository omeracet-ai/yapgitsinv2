import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('user_blocks')
@Unique('UQ_user_block_pair', ['blockerUserId', 'blockedUserId'])
export class UserBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  blockerUserId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  blockedUserId: string;

  @CreateDateColumn()
  createdAt: Date;
}
