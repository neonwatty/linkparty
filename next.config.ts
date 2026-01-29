import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  // Static export for Capacitor iOS builds (only in production)
  // In dev mode, we use normal server rendering for dynamic routes
  ...(isProd && { output: 'export' }),

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Trailing slashes help with static hosting
  trailingSlash: true,

  // Note: Redirects don't work with static export
  // Handle /?join=CODE -> /join/CODE client-side in the home page
}

export default nextConfig
