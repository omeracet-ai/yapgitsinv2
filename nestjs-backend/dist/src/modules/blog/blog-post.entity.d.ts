export declare enum BlogPostStatus {
    DRAFT = "draft",
    PUBLISHED = "published",
    ARCHIVED = "archived"
}
export declare class BlogPost {
    id: string;
    tenantId: string | null;
    slug: string;
    title: string;
    content: string;
    excerpt: string;
    coverImageUrl?: string | null;
    authorId?: string | null;
    category?: string | null;
    tags?: string[] | null;
    status: BlogPostStatus;
    publishedAt?: Date | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
