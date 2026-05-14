import { BlogPostStatus } from '../blog-post.entity';

export class CreateBlogPostDto {
  slug!: string;
  title!: string;
  content!: string;
  excerpt?: string;
  coverImageUrl?: string | null;
  category?: string | null;
  authorId?: string | null;
  tags?: string[];
  status?: BlogPostStatus;
  publishedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export class UpdateBlogPostDto {
  slug?: string;
  title?: string;
  content?: string;
  excerpt?: string;
  coverImageUrl?: string | null;
  category?: string | null;
  authorId?: string | null;
  tags?: string[];
  status?: BlogPostStatus;
  publishedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}
