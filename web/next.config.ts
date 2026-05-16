import type { NextConfig } from "next";

// Phase 170 — Public web (statik export). `headers()` statik export
// build'inde uygulanmaz (yalnız dev server'da etkin); production HTTP
// header'ları IIS web.config <httpProtocol><customHeaders> bloğunda
// veya Plesk Apache/Nginx vhost'unda set edilmelidir.
//
// Statik HTML için CSP <meta http-equiv="Content-Security-Policy" ...>
// app/layout.tsx içinde meta tag olarak da eklenebilir.
const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://plausible.io",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://yapgitsin.tr wss://yapgitsin.tr https://api.yapgitsin.tr wss://api.yapgitsin.tr https://plausible.io",
      "frame-src 'self' https://sandbox-api.iyzipay.com https://api.iyzipay.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },

  // Next.js 16 Turbopack — webpack config devre dışı.
  turbopack: {},

  // Dev server için aktif; prod static build'te no-op.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
