import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lint is run separately; the production build must not fail on style-only rules.
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
