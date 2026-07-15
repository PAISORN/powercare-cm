import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    serverActions: {
      // Multipart form metadata adds a little overhead beyond the 5 MB file limit.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
