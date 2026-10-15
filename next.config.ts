import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Fija el root de Turbopack al directorio del proyecto. Necesario porque el
  // proyecto vive dentro de C:\Users\Vic\.antseed\projects y Next 16 podría
  // detectar C:\Users\Vic (home) como root, ignorando el lockfile.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
