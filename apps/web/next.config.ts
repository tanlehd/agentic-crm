import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'standalone', poweredByHeader: false,
  async rewrites() {
    const api = process.env.API_INTERNAL_URL;
    return [
      ...(api ? ['/api/:path*', '/auth/:path*'].map(source => ({ source, destination: `${api}${source}` })) : []),
    ];
  },
};
export default config;
