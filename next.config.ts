import type { NextConfig } from 'next';

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // Enable Turbopack for development
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  devIndicators: {
    position: 'bottom-right',
  },

  // SASS configuration
  sassOptions: {
    includePaths: ['./app/styles'],
  },

  // Enable TypeScript
  typescript: {
    /*
     * !! WARN !!
     * Dangerously allow production builds to successfully complete even if
     * your project has type errors.
     * !! WARN !!
     */
    ignoreBuildErrors: true,
  },

  // Enable ESLint
  eslint: {
    /*
     * Warning: This allows production builds to successfully complete even if
     * your project has ESLint errors.
     */
    ignoreDuringBuilds: true,
  },

  // Webpack configuration for production builds only
  webpack: (config, { isServer, dev }) => {
    // Only apply webpack configuration for production builds
    if (!dev) {
      // Node polyfills for client-side
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false,
          crypto: false,
          stream: false,
          url: false,
          zlib: false,
          http: false,
          https: false,
          assert: false,
          os: false,
          path: false,
          buffer: 'buffer',
          process: 'process/browser',
          util: 'util',
        };
      }

      config.cache = true;
    }

    // Add SVG handling for both development and production
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },

  // Image optimization
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Redirects and rewrites
  async redirects() {
    return [
      // Add any redirects here
    ];
  },
  async rewrites() {
    return [
      // Add any rewrites here
    ];
  },

  // Headers
  async headers() {
    return [
      {
        source: '/((?!api/execute-query).*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
      {
        source: '/api/execute-query',
        headers: [
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: '*',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
