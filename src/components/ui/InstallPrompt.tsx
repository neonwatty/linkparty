import { usePWAInstall } from '../../hooks/usePWAInstall'

/**
 * Shows a prompt to install the PWA
 */
export function InstallPrompt() {
  const { canInstall, install, dismiss } = usePWAInstall()

  if (!canInstall) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 animate-fade-in-up">
      <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 shadow-xl max-w-sm mx-auto">
        <div className="flex items-start gap-3">
          <div className="text-2xl">📲</div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">Install Link Party</h3>
            <p className="text-sm text-text-muted mb-3">
              Add to your home screen for the best experience
            </p>
            <div className="flex gap-2">
              <button
                onClick={install}
                className="flex-1 bg-accent-500 hover:bg-accent-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Install
              </button>
              <button
                onClick={dismiss}
                className="px-4 py-2 text-text-muted hover:text-white transition-colors text-sm"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
