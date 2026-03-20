'use client'

import { useState } from 'react'
import { trackWaitlistSignup, trackWaitlistFailed } from '@/lib/analytics'

const STORAGE_KEY = 'lp-waitlist-joined'

function getInitialJoined(): boolean {
  try {
    return !!localStorage.getItem(STORAGE_KEY)
  } catch {
    return false
  }
}

export function EmailCapture() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [alreadyJoined] = useState(getInitialJoined)

  if (alreadyJoined || status === 'success') {
    return (
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-16 sm:pb-24 text-center">
        <div className="card p-6 sm:p-8">
          <p className="text-accent-400 font-semibold">You&rsquo;re on the waitlist!</p>
          <p className="text-text-muted text-sm mt-1">We&rsquo;ll let you know when something cool ships.</p>
        </div>
      </section>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) return

    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          name: name.trim() || undefined,
          source: 'landing_page',
        }),
      })
      if (res.ok) {
        setStatus('success')
        trackWaitlistSignup('landing_page')
        try {
          localStorage.setItem(STORAGE_KEY, '1')
        } catch {
          /* private browsing */
        }
      } else {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error || 'Something went wrong')
        setStatus('error')
        trackWaitlistFailed(data.error || 'unknown')
      }
    } catch {
      setErrorMsg('Something went wrong')
      setStatus('error')
      trackWaitlistFailed('network_error')
    }
  }

  return (
    <section className="relative z-10 max-w-4xl mx-auto px-6 pb-16 sm:pb-24 text-center">
      <div className="card p-6 sm:p-8">
        <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Join the waitlist
        </h3>
        <p className="text-text-muted text-sm mb-5">
          Drop your info to get early access &mdash; no spam, just updates.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
          <input
            type="text"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input w-full text-sm"
            maxLength={100}
          />
          <div className="flex flex-col sm:flex-row w-full gap-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full sm:flex-1 text-sm"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="btn btn-primary text-sm px-6 py-2 whitespace-nowrap"
            >
              {status === 'loading' ? 'Joining...' : 'Join the waitlist'}
            </button>
          </div>
        </form>
        {status === 'error' && <p className="text-red-400 text-xs mt-2">{errorMsg}</p>}
      </div>
    </section>
  )
}
