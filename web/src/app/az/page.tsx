import renderHome from '../_locale_pages/home';
export const revalidate = 3600;
export default async function Page() {
  return renderHome('az');
}
