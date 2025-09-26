import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)', // apply to all routes and static files
        headers: [
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin', // allow everything
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
