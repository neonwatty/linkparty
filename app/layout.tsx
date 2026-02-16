import type { Metadata, Viewport } from 'next'
import { Instrument_Serif, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Providers } from './providers'
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
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  openGraph: {
    title: 'Link Party — Stop losing links in chat',
    description:
      'Great links get buried in group chats. Link Party gives your crew one shared queue — so every link actually gets watched.',
    type: 'website',
    url: 'https://linkparty.app',
    siteName: 'Link Party',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Link Party — Stop losing links in chat',
    description:
      'Great links get buried in group chats. Link Party gives your crew one shared queue — so every link actually gets watched.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1A1D2E',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${inter.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  )
}
