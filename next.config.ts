import type { NextConfig } from 'next'

// Use static export only for Capacitor iOS builds (set STATIC_EXPORT=true)
// Vercel deployments need server mode for API routes
const useStaticExport = process.env.STATIC_EXPORT === 'true'

const nextConfig: NextConfig = {
  // Static export for Capacitor iOS builds only
  ...(useStaticExport && { output: 'export' }),

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
