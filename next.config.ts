import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["lite-pos.test"],
  agentRules: false,
  serverExternalPackages: ["sync-mysql", "sync-rpc"],
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
