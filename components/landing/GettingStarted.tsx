'use client'

import { useState } from 'react'
import { PlusIcon, LinkIcon, TvIcon } from '@/components/icons'

const DISMISSED_KEY = 'lp-getting-started-dismissed'

function getInitialDismissed(): boolean {
  try {
    return !!localStorage.getItem(DISMISSED_KEY)
  } catch {
    return false
  }
}

const steps = [
  { icon: PlusIcon, title: 'Start a party', description: 'Get a code. Share it.' },
  { icon: LinkIcon, title: 'Drop your links', description: 'YouTube, tweets, Reddit, notes, images.' },
  { icon: TvIcon, title: 'Watch together', description: 'TV mode. Big screen. One tap.' },
]

export function GettingStarted() {
  const [dismissed] = useState(getInitialDismissed)

  if (dismissed) return null

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      /* private browsing */
    }
    window.location.reload()
  }

  return (
    <div className="mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">How it works</h2>
        <button onClick={handleDismiss} className="text-xs text-text-muted hover:text-text-secondary transition-colors">
          Dismiss
        </button>
      </div>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={step.title} className="card p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-400 shrink-0">
              <step.icon />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {i + 1}. {step.title}
              </p>
              <p className="text-xs text-text-muted">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
