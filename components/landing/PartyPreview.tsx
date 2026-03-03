'use client'

const sampleItems = [
  { type: 'youtube', title: 'Best hiking trails in New Zealand', user: 'Alex' },
  { type: 'link', title: 'This tiny house design is insane', user: 'Jordan' },
  { type: 'note', title: "Let's watch this one next!", user: 'Sam' },
  { type: 'youtube', title: 'How to make the perfect espresso', user: 'Alex' },
]

const typeIcons: Record<string, string> = {
  youtube: '\u25B6',
  link: '\u{1F517}',
  note: '\u{1F4DD}',
}

export function PartyPreview() {
  return (
    <section className="relative z-10 max-w-4xl mx-auto px-6 pb-16 sm:pb-24">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4" style={{ fontFamily: 'var(--font-display)' }}>
        See it in action
      </h2>
      <p className="text-text-secondary text-center text-sm mb-8">A shared queue everyone can add to</p>

      <div className="card p-4 sm:p-6 max-w-md mx-auto animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        {/* Mock header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-sm font-medium text-text-primary">Movie Night</span>
          </div>
          <span className="text-xs text-text-muted">3 watching</span>
        </div>

        {/* Mock queue */}
        <div className="space-y-2">
          {sampleItems.map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg ${i === 0 ? 'bg-accent-500/10 border border-accent-500/20' : 'bg-surface-800/50'}`}
            >
              <span className="text-sm flex-shrink-0" aria-hidden="true">
                {typeIcons[item.type]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{item.title}</p>
                <p className="text-xs text-text-muted">{item.user}</p>
              </div>
              {i === 0 && <span className="text-xs text-accent-400 font-medium flex-shrink-0">Now playing</span>}
            </div>
          ))}
        </div>

        {/* Mock FAB hint */}
        <div className="mt-4 pt-3 border-t border-surface-700 text-center">
          <span className="text-xs text-text-muted">Anyone can add links, notes, and images</span>
        </div>
      </div>
    </section>
  )
}
