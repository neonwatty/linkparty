import { Suspense } from 'react'
import type { Metadata } from 'next'
import JoinWithCodeClient from './JoinWithCodeClient'

// Required for static export with dynamic routes
// Return a placeholder to generate a fallback page
export function generateStaticParams() {
  return [{ code: '_placeholder' }]
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params
  const displayCode = code === '_placeholder' ? '' : code.toUpperCase()

  return {
    title: displayCode ? `Join Party ${displayCode} | Link Party` : 'Join a Party | Link Party',
    description: displayCode
      ? `You've been invited to a Link Party! Use code ${displayCode} to join and start sharing content together in real-time.`
      : 'Join a Link Party and start sharing content together in real-time.',
    openGraph: {
      title: displayCode ? `Join Party ${displayCode} on Link Party` : 'Join a Party on Link Party',
      description: displayCode
        ? `You've been invited! Use code ${displayCode} to join and watch together.`
        : 'Join a Link Party and watch together.',
      type: 'website',
      siteName: 'Link Party',
      images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'Link Party' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: displayCode ? `Join Party ${displayCode} on Link Party` : 'Join a Party on Link Party',
      description: displayCode
        ? `You've been invited! Use code ${displayCode} to join and watch together.`
        : 'Join a Link Party and watch together.',
      images: ['/icons/icon-512.png'],
    },
  }
}

export default function JoinWithCodePage() {
  return (
    <Suspense>
      <JoinWithCodeClient />
    </Suspense>
  )
}
