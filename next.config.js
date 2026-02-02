const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: false, // Отключено для избежания дублирования WebSocket событий
  allowedDevOrigins: ['moment-lbs.app', 'dev.moment-lbs.app'],
  // basePath: '/app',

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['framer-motion', '@heroui/react'],
  },

  // Performance optimizations
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    // Include small widths so icons/thumbnails get lighter responsive variants
    deviceSizes: [192, 256, 320, 480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,

    qualities: [50, 60, 70, 75, 80, 85, 90],
    dangerouslyAllowSVG: false,
    contentDispositionType: 'inline',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Turbopack configuration (empty to silence warning)
  turbopack: {},

  // Rewrites для переведенных URL
  // ⚠️ ВАЖНО: Автоматически генерируется из словарей!
  // Для обновления выполните: npm run generate:routes
  async rewrites() {
    const getGeneratedRewrites = require('./config/rewrites.generated.js')
    const generatedRewrites = await getGeneratedRewrites()

    // Прокси для SeaweedFS
    // В Docker используйте имя сервиса (напр. http://filer:8888) через переменную SEAWEED_FILER_URL
    const seaweedUrl = (process.env.SEAWEED_FILER_URL || 'http://localhost:8888').replace(/\/$/, '')
    console.log('🔌 SeaweedFS Proxy Destination:', seaweedUrl)

    const proxyRewrite = {
      source: '/api/seaweed-proxy/:path*',
      destination: `${seaweedUrl}/:path*`,
    }

    if (Array.isArray(generatedRewrites)) {
      return [...generatedRewrites, proxyRewrite]
    }
    return {
      ...generatedRewrites,
      fallback: [...(generatedRewrites.fallback || []), proxyRewrite],
    }
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googletagmanager.com https://*.google-analytics.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' wss://dev.moment-lbs.app https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://stats.g.doubleclick.net https://analytics.google.com https://photon.komoot.io",
              "worker-src 'self' blob:",
              "frame-src 'self'",
              "child-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              'upgrade-insecure-requests',
            ].join('; '),
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          // COEP removed - too strict, breaks Google Analytics
          // {
          //   key: 'Cross-Origin-Embedder-Policy',
          //   value: 'require-corp',
          // },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
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
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig

/*
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    console.log("[Next.js] API rewrite destination:", apiUrl);
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
*/
