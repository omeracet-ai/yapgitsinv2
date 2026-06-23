import type { NextConfig } from "next";

// Phase 170/526 — Admin panel sıkı CSP + clickjacking koruması.
// frame-ancestors 'none' = admin paneli hiçbir iframe'e gömülmesine izin verme.
//
// Phase 526 notu (CSP unsafe-inline/unsafe-eval):
//   - Next.js standalone runtime hydration için inline <script> (__NEXT_DATA__,
//     runtime chunk preload) kullanır → script-src 'unsafe-inline' KALMALI.
//     Tam nonce'lı CSP için Next 16 middleware ile per-request nonce gerekir
//     (next.config.js header() static; runtime nonce burada üretilemez). Bu
//     büyük refactor; bu fazda kapsam dışı (Phase 527 — admin nonce middleware).
//   - 'unsafe-eval' KALDIRILDI: Next 16 prod build'i eval gerektirmez (sadece
//     turbopack dev'de gerekir; admin prod'a deploy ediliyor).
//   - Iyzipay frame-src: NODE_ENV gate — prod sadece live API.
//
// Phase 526 — Permissions-Policy:
//   - payment=(self) eklendi (Iyzipay redirect flow için)
//   - camera/mic/geolocation = empty (admin panel hiçbirine ihtiyaç duymaz)
const IS_PROD = process.env.NODE_ENV === "production";
const IYZI_FRAME = IS_PROD
  ? "https://api.iyzipay.com"
  : "https://sandbox-api.iyzipay.com https://api.iyzipay.com";

const ADMIN_SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: https: blob:",
      // 'unsafe-eval' kaldırıldı (Phase 526). 'unsafe-inline' Next runtime için kalır.
      "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "connect-src 'self' https://api.yapgitsin.tr wss://api.yapgitsin.tr https://yapgitsin.tr wss://yapgitsin.tr",
      `frame-src 'self' ${IYZI_FRAME}`,
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(self), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // Standalone build for IIS+iisnode hosting (server.js entry, minimal node_modules)
  output: "standalone",
  // FTP dot-directory workaround: .next/ → dist/ (non-dot, FileZilla compatible).
  // URL path /_next/static/ is unchanged; only the filesystem output dir changes.
  distDir: "dist",
  // Phase 178 — admin artık admin.yapgitsin.tr subdomain'inde, basePath kaldırıldı.

  async headers() {
    return [
      {
        source: "/:path*",
        headers: ADMIN_SECURITY_HEADERS,
      },
      // Phase 528 (M1 fix) — Root redirect (/) Next 16 standalone default'unda
      // `Cache-Control: s-maxage=31536000` ile dönüyordu; landing değiştirmek
      // için tüm CDN'i purge etmek gerekiyordu. 60s short cache: değişiklik
      // ≤1dk içinde tüm edge'lere yayılır, ekstra origin yükü ihmal edilebilir.
      {
        source: "/",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, must-revalidate" },
        ],
      },
      // Hashed Next.js static assets — 1y immutable. Admin runs Next.js standalone
      // under iisnode (web.config rewrites everything to server.js), so IIS
      // <location> cache headers don't apply. Configure via next.config headers().
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
