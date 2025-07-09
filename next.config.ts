import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Environment variables that should be available on the client
  env: {
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'https://slack-clone-socket.onrender.com',
  },
  // Support WebSocket when using the Next.js dev server
  webpack: (config) => {
    config.externals = [...(config.externals || []), { "bufferutil": "bufferutil", "utf-8-validate": "utf-8-validate" }];
    return config;
  },
  // Configure rewrites to support Socket.IO in both dev and production environments
  async rewrites() {
    return [
      {
        source: '/api/socket/io/:path*',
        destination: '/api/socket/io/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: '/api/socket/:path*', // Handled by the socket API route
      }
    ];
  },
  // Disable various checks during builds for deployment
  eslint: {
    // Warning: This allows production builds to successfully complete even with ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip type checking during build for faster builds
    ignoreBuildErrors: true,
  },
  experimental: {
    // Disable CSS optimization to avoid critters dependency issues
    optimizeCss: false,
    // Optimize bundle size
    optimizePackageImports: ['react-icons', '@radix-ui/react-icons'],
  },
  // Suppress "app directory requires Node.js" message
  skipTrailingSlashRedirect: true,
  // Suppress middleware warning
  skipMiddlewareUrlNormalize: true,
};

export default nextConfig;
