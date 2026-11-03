import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server in .next/standalone for the container image (see Dockerfile).
  output: "standalone",

  turbopack: {},
};

export default nextConfig;
