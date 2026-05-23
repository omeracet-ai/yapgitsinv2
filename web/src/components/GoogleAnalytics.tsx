import Script from 'next/script';

// Google Analytics 4 — NEXT_PUBLIC_GA_ID (G-XXXXXXX) set edilirse yüklenir.
// Yalnızca production'da aktif. ID env'den gelir (operatör kontrollü, kullanıcı girdisi değil).
export default function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (!id || process.env.NODE_ENV !== 'production') return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}',{anonymize_ip:true});`}
      </Script>
    </>
  );
}
