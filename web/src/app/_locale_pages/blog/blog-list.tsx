import Link from 'next/link';
import type { Metadata } from 'next';
import { getBlogPosts, type BlogPost } from '@/lib/api';
import { localePath, type Locale } from '@/i18n';
import { jsonLd, breadcrumbLD, clip } from '@/lib/seo';

export async function buildBlogListMetadata(L: Locale): Promise<Metadata> {
  const title = L === 'en' ? 'Blog — Yapgitsin' : L === 'az' ? 'Blog — Yapgitsin' : 'Blog — Yapgitsin';
  const description =
    L === 'en'
      ? 'Tips, guides and stories from local service pros.'
      : L === 'az'
        ? 'Yerli usta və xidmət təminatçılarından bələdçilər.'
        : 'Usta seçimi, fiyatlar ve hizmet rehberleri.';
  return { title, description, openGraph: { title, description } };
}

export default async function renderBlogList(L: Locale) {
  const result = await getBlogPosts({ page: '1', limit: '30' });
  const posts: BlogPost[] = result?.data ?? [];
  const home = L === 'en' ? 'Home' : L === 'az' ? 'Ana səhifə' : 'Anasayfa';
  const blogLabel = 'Blog';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbLD([
              { name: home, url: localePath(L, '/') },
              { name: blogLabel, url: localePath(L, '/blog') },
            ]),
          ),
        }}
      />
      <section className="bg-white border-b border-[var(--border)]">
        <div className="container mx-auto max-w-5xl px-4 md:px-6 lg:px-8 py-8 md:py-10">
          <nav className="text-xs text-gray-500 mb-3">
            <Link href={localePath(L, '/')} className="hover:underline">{home}</Link> / <span>{blogLabel}</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--secondary)]">{blogLabel}</h1>
          <p className="text-gray-600 mt-2 text-sm md:text-base">
            {L === 'en'
              ? 'Practical guides, pricing breakdowns and how-tos.'
              : L === 'az'
                ? 'Praktik bələdçilər və qiymət təhlilləri.'
                : 'Pratik rehberler, fiyat analizleri ve nasıl yapılır yazıları.'}
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 md:px-6 lg:px-8 py-8 md:py-10">
        {posts.length === 0 ? (
          <div className="text-center text-gray-500 py-16 text-sm">
            {L === 'en' ? 'No posts yet.' : L === 'az' ? 'Hələ yazı yoxdur.' : 'Henüz yazı yok.'}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Link
                key={p.id}
                href={localePath(L, `/blog/${p.slug}`)}
                className="group bg-white border border-[var(--border)] rounded-xl overflow-hidden hover:shadow-md transition"
              >
                {p.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.coverImageUrl}
                    alt={p.title}
                    className="w-full aspect-[16/9] object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-[16/9] bg-[var(--primary-light)]" />
                )}
                <div className="p-4">
                  <h2 className="font-bold text-[var(--secondary)] group-hover:text-[var(--primary)] line-clamp-2">
                    {p.title}
                  </h2>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-3">{clip(p.excerpt || '', 140)}</p>
                  {p.publishedAt && (
                    <div className="text-xs text-gray-400 mt-3">
                      {new Date(p.publishedAt).toLocaleDateString(L === 'en' ? 'en-US' : L === 'az' ? 'az-AZ' : 'tr-TR')}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
