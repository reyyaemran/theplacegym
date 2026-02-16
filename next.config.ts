import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Optimized for Vercel deployment
  reactStrictMode: true,
  // Note: swcMinify is now enabled by default in Next.js 13+ and removed in Next.js 16
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
