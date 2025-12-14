import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Optimized for Vercel deployment
  reactStrictMode: true,
  // Enable SWC minification (default in Next.js 13+)
  swcMinify: true,
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
