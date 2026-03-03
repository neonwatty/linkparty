import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Account | Link Party',
  description:
    'Create a free Link Party account. Share YouTube videos, tweets, Reddit posts, and images with your crew in one shared queue.',
  openGraph: {
    title: 'Create Account | Link Party',
    description: 'Create a free account and start sharing links with your crew.',
    type: 'website',
    siteName: 'Link Party',
  },
  twitter: {
    card: 'summary',
    title: 'Create Account | Link Party',
    description: 'Create a free account and start sharing links with your crew.',
  },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
