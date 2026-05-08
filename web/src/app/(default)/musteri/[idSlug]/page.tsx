import type { Metadata } from 'next';
import renderCustomer, {
  buildCustomerMetadata,
  getCustomerStaticSlugs,
} from '../../../_locale_pages/musteri/[idSlug]/customer';

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getCustomerStaticSlugs();
  return slugs.map((idSlug) => ({ idSlug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ idSlug: string }>;
}): Promise<Metadata> {
  const { idSlug } = await params;
  return buildCustomerMetadata('tr', idSlug);
}

export default async function Page({
  params,
}: {
  params: Promise<{ idSlug: string }>;
}) {
  const { idSlug } = await params;
  return renderCustomer('tr', idSlug);
}
