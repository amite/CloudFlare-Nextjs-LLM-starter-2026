import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // Enable experimental features for Cloudflare Workers
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Turbopack configuration for Cloudflare Workers
  // This resolves the "Webpack is configured while Turbopack is not" warning
  turbopack: {
    resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    // Configure resolveAlias for external modules
    // This provides equivalent functionality to webpack externals
    resolveAlias: {
      // Externalize better-sqlite3 to avoid bundling in turbopack
      "better-sqlite3": false,
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
