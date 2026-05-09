import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum BlogPostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('blog_posts')
@Unique('UQ_blog_posts_tenant_slug', ['tenantId', 'slug'])
export class BlogPost {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  tenantId!: string | null;

  @Column({ type: 'varchar', length: 200 })
  slug!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 500, default: '' })
  excerpt!: string;

  @Column({ type: 'varchar', nullable: true })
  coverImageUrl?: string | null;

  @Column({ type: 'varchar', nullable: true })
  authorId?: string | null;

  @Column({ type: 'simple-json', nullable: true })
  tags?: string[] | null;

  @Column({ type: 'simple-enum', enum: BlogPostStatus, default: BlogPostStatus.DRAFT })
  status!: BlogPostStatus;

  @Column({ type: 'datetime', nullable: true })
  publishedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
