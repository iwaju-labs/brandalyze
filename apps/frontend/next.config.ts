import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "yourwebsitescore.com",
        pathname: "/**",
      }
    ]
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://tally.so https://*.clerk.accounts.dev https://clerk.brandalyze.io https://challenges.cloudflare.com https://cloud.umami.is https://api-gateway.umami.dev",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' http://localhost:8000 https://brandalyze.onrender.com https://*.clerk.accounts.dev https://clerk.brandalyze.io https://tally.so wss://*.clerk.accounts.dev wss://clerk.brandalyze.io https://cloud.umami.is https://api-gateway.umami.dev",
              "frame-src https://tally.so https://*.clerk.accounts.dev https://clerk.brandalyze.io https://challenges.cloudflare.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
