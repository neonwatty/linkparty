import type { NextConfig } from 'next'

// Use static export only for Capacitor iOS builds (set STATIC_EXPORT=true)
// Vercel deployments need server mode for API routes
const useStaticExport = process.env.STATIC_EXPORT === 'true'

const isDev = process.env.NODE_ENV !== 'production'

const nextConfig: NextConfig = {
  // Static export for Capacitor iOS builds only
  ...(useStaticExport && { output: 'export' }),

  // Disable image optimization only for static export (Capacitor builds)
  images: {
    unoptimized: useStaticExport,
  },

  // Trailing slashes help with static hosting
  trailingSlash: true,

  // Security response headers (ignored during static export / Capacitor builds)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              `img-src 'self' data: blob: https://*.supabase.co https://i.ytimg.com https://pbs.twimg.com${isDev ? ' http://localhost:*' : ''}`,
              `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://va.vercel-scripts.com${isDev ? ' http://localhost:* ws://localhost:*' : ''}`,
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },

  // Note: Redirects don't work with static export
  // Handle /?join=CODE -> /join/CODE client-side in the home page
}

export default nextConfig
