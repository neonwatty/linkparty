'use client'

import Link from 'next/link'

export default function PartyError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Party Error</h1>
        <p className="text-text-muted mb-6">
          Something went wrong with this party. It may have expired or been removed.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-500 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-surface-700 text-white rounded-xl font-semibold hover:bg-surface-600 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
