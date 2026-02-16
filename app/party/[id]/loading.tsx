export default function PartyLoading() {
  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-muted">Loading party...</p>
      </div>
    </div>
  )
}
