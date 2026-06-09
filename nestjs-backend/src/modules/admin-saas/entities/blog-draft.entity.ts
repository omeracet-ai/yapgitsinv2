import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * M4 — Keyword Finder blog draft. AI-generated markdown for SEO opportunity.
 */
@Entity('blog_drafts')
export class BlogDraft {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  query!: string;

  @Index('uq_blog_draft_slug', { unique: true })
  @Column({ type: 'varchar', length: 200 })
  slug!: string;

  @Column({ type: 'text' })
  markdown!: string;

  @Column({ type: 'float', nullable: true })
  gscPosition!: number | null;

  @Column({ type: 'integer', nullable: true })
  gscImpressions!: number | null;

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status!: 'draft' | 'published' | 'archived';

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
