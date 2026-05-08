import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum BoostType {
  FEATURED_24H = 'featured_24h',
  FEATURED_7D = 'featured_7d',
  TOP_SEARCH_24H = 'top_search_24h',
}

export enum BoostStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('worker_boosts')
@Index(['userId', 'status'])
export class Boost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'simple-enum', enum: BoostType })
  type: BoostType;

  @Column({ type: 'int' })
  tokenCost: number;

  @Column({ type: 'datetime' })
  startsAt: Date;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'simple-enum', enum: BoostStatus, default: BoostStatus.ACTIVE })
  status: BoostStatus;

  @CreateDateColumn()
  createdAt: Date;
}

export const BOOST_PACKAGES: Array<{
  type: BoostType;
  tokenCost: number;
  durationHours: number;
  name: string;
  description: string;
}> = [
  {
    type: BoostType.FEATURED_24H,
    tokenCost: 50,
    durationHours: 24,
    name: 'Öne Çıkan — 24 Saat',
    description: 'Ana sayfa featured slot, 24 saat boyunca.',
  },
  {
    type: BoostType.FEATURED_7D,
    tokenCost: 250,
    durationHours: 24 * 7,
    name: 'Öne Çıkan — 7 Gün',
    description: 'Ana sayfa featured slot, 7 gün boyunca.',
  },
  {
    type: BoostType.TOP_SEARCH_24H,
    tokenCost: 100,
    durationHours: 24,
    name: 'Aramada İlk 3 — 24 Saat',
    description: 'Usta arama listesinin ilk 3’ünde, 24 saat.',
  },
];
