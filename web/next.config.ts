import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  async rewrites() {
    return [
      {
        source: '/owner/members/:id/:path*',
        destination: '/trainer/members/:id/:path*',
      },
      {
        source: '/owner/members/:id',
        destination: '/trainer/members/:id',
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'm.ftscrt.com' },
    ],
  },
};

export default nextConfig;
