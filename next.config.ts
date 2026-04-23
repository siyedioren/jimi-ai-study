import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
  distDir: "dist",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
