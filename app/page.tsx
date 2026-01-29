'use client'

import Link from 'next/link'
import { HistoryIcon } from '@/components/icons'

export default function HomePage() {
  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8 safe-area-bottom">
      {/* Header */}
      <div className="flex justify-end mb-4">
        <Link
          href="/history"
          className="btn-ghost p-2 rounded-full"
        >
          <HistoryIcon />
        </Link>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="animate-fade-in-up opacity-0">
          <div className="text-accent-500 font-mono text-sm tracking-wider mb-4">
            SHARE LINKS TOGETHER
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-4">
            Link<br />Party
          </h1>
          <p className="text-text-secondary text-lg mb-6 max-w-xs">
            Share content together. Queue videos, tweets, posts, and notes in real-time.
          </p>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Link
              href="/create"
              className="btn btn-primary w-full text-lg block text-center"
            >
              Start a Party
            </Link>
            <Link
              href="/join"
              className="btn btn-secondary w-full text-lg block text-center"
            >
              Join with Code
            </Link>

            {/* Sign in link - inline with buttons */}
            <div className="text-center pt-2">
              <Link
                href="/login"
                className="text-text-muted text-sm hover:text-text-secondary transition-colors"
              >
                Already have an account? <span className="text-accent-400">Sign in</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
