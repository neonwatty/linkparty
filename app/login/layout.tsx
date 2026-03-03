import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In | Link Party',
  description:
    'Sign in to Link Party to start sharing links with your crew. Create parties, share YouTube videos, tweets, and more in one shared queue.',
  openGraph: {
    title: 'Sign In | Link Party',
    description: 'Sign in to start sharing links with your crew.',
    type: 'website',
    siteName: 'Link Party',
  },
  twitter: {
    card: 'summary',
    title: 'Sign In | Link Party',
    description: 'Sign in to start sharing links with your crew.',
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
