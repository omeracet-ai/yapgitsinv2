import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type ConfirmationSide = 'worker' | 'customer';
export type ConfirmationPhase = 'before' | 'after';

@Entity('escrow_confirmation_photos')
@Index('idx_escrow_confirm_photos_lookup', ['escrowId', 'side', 'phase'])
export class EscrowConfirmationPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  escrowId: string;

  @Column({ type: 'varchar', length: 36 })
  uploadedByUserId: string;

  @Column({ type: 'varchar', length: 16 })
  side: ConfirmationSide;

  @Column({ type: 'varchar', length: 16 })
  phase: ConfirmationPhase;

  @Column({ type: 'varchar', length: 255 })
  photoUrl: string;

  @Column({ type: 'float', nullable: true })
  lat: number | null;

  @Column({ type: 'float', nullable: true })
  lng: number | null;

  @Column({ type: 'datetime', nullable: true })
  takenAt: Date | null;

  @CreateDateColumn()
  uploadedAt: Date;
}
