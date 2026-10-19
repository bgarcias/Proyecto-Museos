import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  experimental: {
    // Los archivos Excel (hasta 5 MB) y las imágenes (hasta 1 MB) viajan en Server Actions.
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
