import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disposable E2E servers must not share the running developer server's build lock.
  distDir: process.env.POWERCARE_NEXT_DIST_DIR || ".next",
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    serverActions: {
      // Multipart form metadata adds a little overhead beyond the 5 MB file limit.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
