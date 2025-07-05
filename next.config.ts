import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Support WebSocket when using the Next.js dev server
  webpack: (config) => {
    config.externals = [...(config.externals || []), { "bufferutil": "bufferutil", "utf-8-validate": "utf-8-validate" }];
    return config;
  },
  // Configure rewrites to support Socket.IO when using the standard Next.js dev server
  // This isn't needed when using the custom server.ts approach
  async rewrites() {
    return [
      {
        source: '/socket.io/:path*',
        destination: '/api/socket', // Handled by the socket API route
      }
    ];
  },
  // Disable ESLint during builds for deployment
  eslint: {
    // Warning: This allows production builds to successfully complete even with ESLint errors
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
