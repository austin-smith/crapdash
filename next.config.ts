import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Creates optimized standalone build for Docker deployment
  output: "standalone",
};

export default nextConfig;
