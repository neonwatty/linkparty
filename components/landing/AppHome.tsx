'use client'

import Link from 'next/link'
import { HistoryIcon, UserIcon } from '@/components/icons'
import { TwinklingStars } from '@/components/ui/TwinklingStars'
import { useAuth } from '@/contexts/AuthContext'

export function AppHome() {
  const { signOut, user } = useAuth()
  const displayName = user?.user_metadata?.display_name || ''

  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8 safe-area-bottom relative">
      {/* Twinkling Stars */}
      <TwinklingStars count={35} />

      {/* Campfire Glow */}
      <div className="campfire-glow" />

      {/* Header */}
      <div className="flex justify-between items-center mb-4 relative z-10">
        <button onClick={signOut} className="text-text-muted text-sm hover:text-text-secondary transition-colors">
          Sign out
        </button>
        <div className="flex items-center gap-2">
          <Link href="/profile" className="icon-btn" aria-label="Profile">
            <UserIcon />
          </Link>
          <Link href="/history" className="icon-btn" aria-label="History">
            <HistoryIcon />
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col justify-center relative z-10">
        <div className="animate-fade-in-up">
          {/* Greeting */}
          {displayName && <p className="text-text-secondary text-center mb-2">Hey, {displayName}</p>}

          {/* Logo Icon */}
          <div className="logo-icon mx-auto mb-6">
            <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 40 40">
              <path d="M20 8c-6 0-12 6-12 14s6 10 12 10 12-2 12-10-6-14-12-14z" fill="currentColor" opacity="0.3" />
              <path d="M20 4v4M12 8l2 3M28 8l-2 3M20 32v4" />
            </svg>
          </div>

          <h1
            className="text-5xl font-bold leading-tight mb-4 text-center"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Link <span className="text-accent-500">Party</span>
          </h1>
          <p className="text-text-secondary text-lg mb-8 max-w-xs mx-auto text-center">
            Gather your people. Share what you've found. Put the phones away and watch together.
          </p>

          {/* CTA Buttons */}
          <div className="space-y-4">
            <Link href="/create" className="btn btn-primary w-full text-lg flex items-center justify-center gap-3">
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Start a Party
            </Link>
            <Link href="/join" className="btn btn-secondary w-full text-lg flex items-center justify-center gap-3">
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 012 2v4M9 21H5a2 2 0 01-2-2v-4M21 9v6M3 9v6" />
              </svg>
              Join with Code
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
