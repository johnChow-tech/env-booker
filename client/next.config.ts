import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/:path*', // 当前端请求 /api/xxxx 时
        destination: 'http://localhost:8080/:path*', // 转发给 Go 后端
      },
    ];
  },
};

export default nextConfig;
