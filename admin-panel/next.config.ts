import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone build for IIS+iisnode hosting (server.js entry, minimal node_modules)
  output: 'standalone',
  // Mounted under /admin on yapgitsin.tr
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? (process.env.NODE_ENV === 'production' ? '/admin' : ''),
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH ?? (process.env.NODE_ENV === 'production' ? '/admin' : ''),
};

export default nextConfig;
