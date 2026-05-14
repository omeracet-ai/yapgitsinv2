import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('review_helpfuls')
@Unique(['reviewId', 'userId'])
export class ReviewHelpful {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  reviewId: string;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
