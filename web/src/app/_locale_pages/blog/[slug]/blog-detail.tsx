import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getBlogPosts, getBlogPost, type BlogPost } from '@/lib/api';
import { localePath, type Locale } from '@/i18n';
import { jsonLd, breadcrumbLD, siteUrl, clip } from '@/lib/seo';

export async function getBlogStaticSlugs(): Promise<string[]> {
  const result = await getBlogPosts({ page: '1', limit: '100' });
  const posts: BlogPost[] = result?.data ?? [];
  return posts.length > 0 ? posts.map((p) => p.slug) : ['bulunamadi'];
}

export async function buildBlogDetailMetadata(L: Locale, slug: string): Promise<Metadata> {
  const post = await getBlogPost(slug);
  if (!post) return { title: L === 'en' ? 'Not found' : L === 'az' ? 'Tapılmadı' : 'Bulunamadı' };
  const title = clip(post.seoTitle || post.title, 60);
  const description = clip(post.seoDescription || post.excerpt || post.content, 158);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: post.coverImageUrl ? [post.coverImageUrl] : ['/og-default.png'],
      ...(post.publishedAt ? { publishedTime: post.publishedAt } : {}),
    },
  };
}

function articleLD(post: BlogPost, L: Locale): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.coverImageUrl ? [post.coverImageUrl] : [siteUrl('/og-default.png')],
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Organization', name: 'Yapgitsin' },
    publisher: {
      '@type': 'Organization',
      name: 'Yapgitsin',
      logo: { '@type': 'ImageObject', url: siteUrl('/logo.png') },
    },
    mainEntityOfPage: siteUrl(L === 'tr' ? `/blog/${post.slug}` : `/${L}/blog/${post.slug}`),
  };
}

export default async function renderBlogDetail(L: Locale, slug: string) {
  const post = await getBlogPost(slug);
  if (!post) return notFound();

  const home = L === 'en' ? 'Home' : L === 'az' ? 'Ana səhifə' : 'Anasayfa';
  const blogLabel = 'Blog';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(articleLD(post, L)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbLD([
              { name: home, url: localePath(L, '/') },
              { name: blogLabel, url: localePath(L, '/blog') },
              { name: post.title, url: localePath(L, `/blog/${post.slug}`) },
            ]),
          ),
        }}
      />

      <article className="bg-white">
        <header className="container mx-auto max-w-3xl px-4 md:px-6 lg:px-8 pt-8 md:pt-10 pb-4">
          <nav className="text-xs text-gray-500 mb-4">
            <Link href={localePath(L, '/')} className="hover:underline">{home}</Link> /{' '}
            <Link href={localePath(L, '/blog')} className="hover:underline">{blogLabel}</Link>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--secondary)] leading-tight">
            {post.title}
          </h1>
          {post.publishedAt && (
            <div className="mt-3 text-sm text-gray-500">
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString(L === 'en' ? 'en-US' : L === 'az' ? 'az-AZ' : 'tr-TR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </div>
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <span key={t} className="text-xs bg-[var(--primary-light)] text-[var(--primary)] px-2 py-1 rounded-full">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </header>

        {post.coverImageUrl && (
          <div className="container mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverImageUrl}
              alt={post.title}
              className="w-full aspect-[16/9] object-cover rounded-xl border border-[var(--border)]"
              loading="eager"
            />
          </div>
        )}

        <div className="container mx-auto max-w-3xl px-4 md:px-6 lg:px-8 py-8 md:py-10">
          <div className="prose prose-slate max-w-none prose-headings:text-[var(--secondary)] prose-a:text-[var(--primary)]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
          </div>
        </div>
      </article>
    </>
  );
}
