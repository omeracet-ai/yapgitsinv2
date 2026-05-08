import type { CategoryContent } from '@/lib/category-content';

type Props = {
  categoryName: string;
  city?: string;
  content: CategoryContent | null;
};

export default function CategorySeoContent({ categoryName, city, content }: Props) {
  const heading = city
    ? `${city} ${categoryName} Hakkında`
    : `${categoryName} Hakkında`;

  // Fallback intro when AI content is missing (backend was offline at build time).
  const description =
    content?.description ||
    `${city ? `${city}'da ` : 'Türkiye genelinde '}${categoryName.toLowerCase()} hizmeti veren güvenilir, doğrulanmış ustalara Yapgitsin üzerinden ulaşabilirsiniz. İhtiyacınızı yazın, kısa sürede teklif alın, fiyat ve referansları karşılaştırarak güvenle çalışacağınız ustayı seçin.`;

  const faqs = content?.faqs ?? [];

  return (
    <>
      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10 border-t border-[var(--border)]">
        <h2 className="text-xl font-bold text-[var(--secondary)] mb-4">{heading}</h2>
        <div className="prose prose-sm md:prose max-w-3xl text-gray-700 whitespace-pre-line leading-relaxed">
          {description}
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10 border-t border-[var(--border)]">
          <h2 className="text-xl font-bold text-[var(--secondary)] mb-5">
            Sıkça Sorulan Sorular
          </h2>
          <div className="max-w-3xl space-y-2">
            {faqs.map((f, i) => (
              <details
                key={i}
                className="bg-white border border-[var(--border)] rounded-lg p-4 group open:shadow-sm"
              >
                <summary className="font-medium text-[var(--secondary)] cursor-pointer list-none flex items-start justify-between gap-3">
                  <span>{f.q}</span>
                  <span className="text-[var(--primary)] text-sm shrink-0 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-gray-600 text-sm leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
