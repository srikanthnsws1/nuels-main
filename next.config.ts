import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Optional: NEXT_DIST_DIR=<folder> builds/exports there instead of out/, without touching .next.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

