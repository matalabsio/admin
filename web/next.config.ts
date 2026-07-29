import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Admin listening MP3 uploads proxy through /api/admin — default 10MB truncates part audio.
  experimental: {
    proxyClientMaxBodySize: "50mb",
  },
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
