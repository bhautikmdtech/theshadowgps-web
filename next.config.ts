import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  experimental: {
    // Add any experimental features you need
  },
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript type checking during builds
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    
    // Add source map support for better error debugging
    if (process.env.NODE_ENV === 'development') {
      config.devtool = 'eval-source-map';
    }
    
    return config;
  },
  // Add environment variables for both development and production
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
  },
  poweredByHeader: false,
  // Increase the timeout for compilation in development
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 5,
  },
};

export default nextConfig;
