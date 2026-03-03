import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Join a Party | Link Party',
  description: 'Join a Link Party with a 6-character code. Start sharing content together in real-time with your crew.',
  openGraph: {
    title: 'Join a Party | Link Party',
    description: 'Enter a party code to join and start sharing content together.',
    type: 'website',
    siteName: 'Link Party',
  },
  twitter: {
    card: 'summary',
    title: 'Join a Party | Link Party',
    description: 'Enter a party code to join and start sharing content together.',
  },
}

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children
}
