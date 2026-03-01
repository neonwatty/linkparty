import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-text-muted mb-6">This page doesn&apos;t exist or has been moved.</p>
        <Link
          href="/"
          className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-500 transition-colors inline-block"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
