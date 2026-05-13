import type { NextConfig } from "next";

// Phase 170 — Admin panel sıkı CSP + clickjacking koruması.
// frame-ancestors 'none' = admin paneli hiçbir iframe'e gömülmesine izin verme.
const ADMIN_SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: https: blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "connect-src 'self' https://api.yapgitsin.tr wss://api.yapgitsin.tr https://yapgitsin.tr wss://yapgitsin.tr",
      "frame-src 'self' https://sandbox-api.iyzipay.com https://api.iyzipay.com",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Standalone build for IIS+iisnode hosting (server.js entry, minimal node_modules)
  output: "standalone",
  // Phase 178 — admin artık admin.yapgitsin.tr subdomain'inde, basePath kaldırıldı.

  async headers() {
    return [
      {
        source: "/:path*",
        headers: ADMIN_SECURITY_HEADERS,
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
