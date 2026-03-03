import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reset Password | Link Party',
  description: 'Reset your Link Party password. Enter your new password to regain access to your account.',
  openGraph: {
    title: 'Reset Password | Link Party',
    description: 'Reset your Link Party password.',
    type: 'website',
    siteName: 'Link Party',
  },
  twitter: {
    card: 'summary',
    title: 'Reset Password | Link Party',
    description: 'Reset your Link Party password.',
  },
}

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
