import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Creates optimized standalone build for Docker deployment
  output: "standalone",
  // Ensure dynamic routes and data directory are included in standalone build
  outputFileTracingIncludes: {
    '/icons/[filename]': ['./data/**/*'],
  },
};

export default nextConfig;
