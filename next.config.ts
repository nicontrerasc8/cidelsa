import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
    proxyClientMaxBodySize: "50mb",
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
