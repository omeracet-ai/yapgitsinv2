import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type { ConfirmationSide } from './escrow-confirmation-photo.entity';

@Entity('escrow_confirmation_videos')
export class EscrowConfirmationVideo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  escrowId: string;

  @Column({ type: 'varchar', length: 36 })
  uploadedByUserId: string;

  @Column({ type: 'varchar', length: 16 })
  side: ConfirmationSide;

  @Column({ type: 'varchar', length: 255 })
  videoUrl: string;

  @Column({ type: 'integer', nullable: true })
  durationSec: number | null;

  @Column({ type: 'float', nullable: true })
  lat: number | null;

  @Column({ type: 'float', nullable: true })
  lng: number | null;

  @CreateDateColumn()
  uploadedAt: Date;
}
