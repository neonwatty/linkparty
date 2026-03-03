import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/signup', '/create', '/join'],
        disallow: ['/api/', '/party/', '/history/', '/profile/', '/admin/'],
      },
    ],
    sitemap: 'https://linkparty.app/sitemap.xml',
  }
}
