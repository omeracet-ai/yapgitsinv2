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
      "connect-src 'self' https://yapgitsin.tr wss://yapgitsin.tr",
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
  // Mounted under /admin on yapgitsin.tr
  basePath:
    process.env.NEXT_PUBLIC_BASE_PATH ??
    (process.env.NODE_ENV === "production" ? "/admin" : ""),
  assetPrefix:
    process.env.NEXT_PUBLIC_BASE_PATH ??
    (process.env.NODE_ENV === "production" ? "/admin" : ""),

  async headers() {
    return [
      {
        source: "/:path*",
        headers: ADMIN_SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
