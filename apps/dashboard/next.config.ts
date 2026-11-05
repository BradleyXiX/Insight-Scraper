import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/dashboard/pricing",
        destination: "/dashboard/billing",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
