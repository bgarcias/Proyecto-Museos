import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  experimental: {
    // Excel de 4 MB con su formulario, o imagen de 1 MB como data URL (unos 1.4 MB). No pasa de 4.5 MB, el tope de las funciones de Vercel.
    serverActions: {
      bodySizeLimit: "4.25mb",
    },
  },
};

export default nextConfig;
