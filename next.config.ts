import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // ── Image optimisation ────────────────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    // Allow images from remote sources
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.vercel.app",
      },
      // Add your custom domain here when ready:
      // { protocol: "https", hostname: "**.theplacegym.com" },
    ],
  },

  // ── Security headers ─────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Prevent MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Basic XSS protection
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Referrer policy
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  // ── Experimental (Next.js 15) ─────────────────────────────────────────
  experimental: {
    // Faster cold starts
    optimizePackageImports: [
      "@radix-ui/react-icons",
      "lucide-react",
      "@tabler/icons-react",
      "recharts",
    ],
  },
};

export default nextConfig;
