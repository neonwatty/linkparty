'use client'

import Link from 'next/link'
import { track } from '@vercel/analytics'
import { PlusIcon, LinkIcon, TvIcon } from '@/components/icons'
import { TwinklingStars } from '@/components/ui/TwinklingStars'

const problems = [
  'Someone drops a video. Three memes later, it\u2019s gone.',
  'You share a link. Two people react. Nobody clicks.',
  '\u2018What should we watch?\u2019 Forty minutes later, still deciding.',
]

const steps = [
  {
    icon: PlusIcon,
    title: 'Start a party',
    description: 'Get a code. Share it. No signups.',
  },
  {
    icon: LinkIcon,
    title: 'Drop your links',
    description: 'YouTube, tweets, Reddit, notes, images \u2014 one queue.',
  },
  {
    icon: TvIcon,
    title: 'Watch together',
    description: 'TV mode. Big screen. One tap to advance.',
  },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-party relative overflow-x-hidden">
      <TwinklingStars count={50} />
      <div className="campfire-glow" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between max-w-4xl mx-auto px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="logo-icon w-9 h-9 flex items-center justify-center">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 40 40">
              <path d="M20 8c-6 0-12 6-12 14s6 10 12 10 12-2 12-10-6-14-12-14z" fill="currentColor" opacity="0.3" />
              <path d="M20 4v4M12 8l2 3M28 8l-2 3M20 32v4" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
            Link Party
          </span>
        </div>
        <Link
          href="/login"
          onClick={() => track('nav_sign_in')}
          className="text-sm text-text-muted hover:text-text-secondary transition-colors"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-12 pb-16 sm:pt-20 sm:pb-24 text-center">
        <div className="animate-fade-in-up opacity-0">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Stop losing links <span className="text-accent-500">in chat</span>
          </h1>
          <p className="text-text-secondary text-lg sm:text-xl max-w-2xl mx-auto mb-10">
            Great links get buried in group chats. Link Party gives your crew one shared queue &mdash; so nothing gets
            missed.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/create"
              onClick={() => track('cta_start_party_hero')}
              className="btn btn-primary text-lg px-8 py-3 flex items-center justify-center gap-3"
            >
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Start a Party
            </Link>
            <Link
              href="/join"
              onClick={() => track('cta_join_with_code')}
              className="btn btn-secondary text-lg px-8 py-3 flex items-center justify-center gap-3"
            >
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 012 2v4M9 21H5a2 2 0 01-2-2v-4M21 9v6M3 9v6" />
              </svg>
              Join with Code
            </Link>
          </div>
        </div>
      </section>

      {/* Sound Familiar? */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-16 sm:pb-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10" style={{ fontFamily: 'var(--font-display)' }}>
          Sound familiar?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {problems.map((text, i) => (
            <div
              key={i}
              className="card p-6 text-center animate-fade-in-up opacity-0"
              style={{ animationDelay: `${(i + 1) * 100}ms` }}
            >
              <p className="text-text-secondary text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-16 sm:pb-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12" style={{ fontFamily: 'var(--font-display)' }}>
          How it works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="card p-6 text-center animate-fade-in-up opacity-0"
              style={{ animationDelay: `${(i + 1) * 100 + 300}ms` }}
            >
              <div className="w-12 h-12 rounded-full bg-accent-500/20 flex items-center justify-center mx-auto mb-4 text-accent-400">
                <step.icon />
              </div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-text-secondary text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-16 sm:pb-24 text-center">
        <div className="card p-8 sm:p-12 animate-fade-in-up opacity-0" style={{ animationDelay: '700ms' }}>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Your links are <span className="text-accent-500">piling up</span>.
          </h2>
          <p className="text-text-secondary mb-8">Start a party and actually watch them.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/create"
              onClick={() => track('cta_start_party_bottom')}
              className="btn btn-primary text-lg px-8 py-3"
            >
              Start a Party
            </Link>
            <Link href="/login" className="text-sm text-text-muted hover:text-text-secondary transition-colors">
              Already have an account?
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-4xl mx-auto px-6 pb-8 text-center">
        <p className="text-text-muted text-sm">Link Party</p>
      </footer>
    </div>
  )
}
