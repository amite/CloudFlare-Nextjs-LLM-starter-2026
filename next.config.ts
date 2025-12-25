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

  // Webpack configuration to externalize better-sqlite3 for edge runtime
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize better-sqlite3 to avoid bundling native modules in edge runtime
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push("better-sqlite3");
      }
    }
    return config;
  },
};

export default nextConfig;
