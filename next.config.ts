import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable experimental features for Cloudflare Workers
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Image optimization via Cloudflare Images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    // When using Cloudflare Images binding, formats are auto-selected
    formats: ["image/avif", "image/webp"],
  },

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Enable React strict mode
  reactStrictMode: true,
};

export default nextConfig;
