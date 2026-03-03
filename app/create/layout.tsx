import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Start a Party | Link Party',
  description:
    'Create a Link Party room and invite your friends. Share a code, drop your links, and watch together on the big screen.',
  openGraph: {
    title: 'Start a Party | Link Party',
    description: 'Create a room, share a code, and watch together.',
    type: 'website',
    siteName: 'Link Party',
  },
  twitter: {
    card: 'summary',
    title: 'Start a Party | Link Party',
    description: 'Create a room, share a code, and watch together.',
  },
}

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children
}
