import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for FTP / shared hosting deploy.
  // Produces fully-rendered HTML/CSS/JS in `out/` directory at build time.
  // See node_modules/next/dist/docs/01-app/02-guides/static-exports.md
  output: 'export',

  // Emit `/foo/index.html` instead of `/foo.html` — friendlier for Apache/nginx
  // shared hosting that doesn't auto-resolve `.html` extension.
  trailingSlash: true,

  // next/image optimization requires a Node server. Disable for static export.
  images: { unoptimized: true },
};

export default nextConfig;
