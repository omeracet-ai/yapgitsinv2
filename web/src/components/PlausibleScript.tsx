export default function PlausibleScript() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain || process.env.NODE_ENV !== 'production') return null;
  return <script defer data-domain={domain} src="https://plausible.io/js/script.js" />;
}
