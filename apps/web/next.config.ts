import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@agro/shared",
    "@agro/rules-engine",
    "@agro/i18n",
    "@agro/ui",
  ],
};

export default nextConfig;
