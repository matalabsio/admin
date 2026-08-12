import type { NextConfig } from "next";
import path from "path";

// Pin Turbopack to this app. Without this, Next walks up to MATA-lab/package-lock.json
// and watches the whole monorepo (~11GB, including Video/) — enough to freeze an 8GB Mac.
const appRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  devIndicators: false,
  // Pin roots only for local monorepo. On Vercel this makes the packager look
  // for .next at /vercel/path0 instead of web/.next (ENOENT routes-manifest).
  ...(process.env.VERCEL
    ? {}
    : {
        turbopack: { root: appRoot },
        outputFileTracingRoot: appRoot,
      }),
  // Admin listening MP3 uploads proxy through /api/admin — default 10MB truncates part audio.
  experimental: {
    proxyClientMaxBodySize: "100mb",
  },
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
