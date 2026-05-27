import type { NextConfig } from "next";

const isStaticExport = process.env.EXPORT_STATIC === '1'

const nextConfig: NextConfig = {
  output: isStaticExport ? 'export' : undefined,
  distDir: isStaticExport ? 'dist' : undefined,
  images: {
    unoptimized: isStaticExport,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
