import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable static export to enable API routes
  output: undefined,

  turbopack: {},
};

export default nextConfig;
