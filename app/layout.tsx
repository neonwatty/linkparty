import type { Metadata, Viewport } from 'next'
import { Instrument_Serif, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Providers } from './providers'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { CookieConsentBanner } from '@/components/CookieConsentBanner'
import './globals.css'

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['400'],
})

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://linkparty.app'),
  title: 'Link Party — Stop losing links in chat',
  description:
    'Great links get buried in group chats. Link Party gives your crew one shared queue — so every link actually gets watched.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Link Party',
  },
  icons: {
    icon: [
      { url: '/icons/logo.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Link Party — Stop losing links in chat',
    description:
      'Great links get buried in group chats. Link Party gives your crew one shared queue — so every link actually gets watched.',
    type: 'website',
    url: 'https://linkparty.app',
    siteName: 'Link Party',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'Link Party' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Link Party — Stop losing links in chat',
    description:
      'Great links get buried in group chats. Link Party gives your crew one shared queue — so every link actually gets watched.',
    images: ['/icons/icon-512.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1A1D2E',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Link Party',
  url: 'https://linkparty.app',
  description:
    'Great links get buried in group chats. Link Party gives your crew one shared queue — so every link actually gets watched.',
  applicationCategory: 'EntertainmentApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${inter.variable}`}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-3 focus:bg-accent-500 focus:text-white focus:rounded-md focus:m-2"
        >
          Skip to main content
        </a>
        <ErrorBoundary>
          <CookieConsentBanner />
          <Providers>
            <main id="main-content">{children}</main>
          </Providers>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  )
}
