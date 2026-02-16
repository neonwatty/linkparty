'use client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error('GlobalError boundary caught:', error)
  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
        <p className="text-text-muted mb-6">An unexpected error occurred. Please try again.</p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-500 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
