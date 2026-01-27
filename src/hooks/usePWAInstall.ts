import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAInstallState {
  canInstall: boolean
  isInstalled: boolean
  install: () => Promise<boolean>
  dismiss: () => void
}

// Check if user previously dismissed (computed outside hook to avoid effect setState)
function getInitialDismissed(): boolean {
  const dismissedTime = localStorage.getItem('link-party-install-dismissed')
  if (dismissedTime) {
    const dismissedDate = new Date(dismissedTime)
    const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceDismissed < 7
  }
  return false
}

// Check if app is installed (computed outside hook)
function getInitialInstalled(): boolean {
  if (typeof window === 'undefined') return false
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  const isIOSStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return isStandalone || isIOSStandalone
}

/**
 * Hook to manage PWA installation prompt
 */
export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(getInitialInstalled)
  const [dismissed, setDismissed] = useState(getInitialDismissed)

  useEffect(() => {

    // Listen for beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    // Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setIsInstalled(true)
        setDeferredPrompt(null)
        return true
      }
      return false
    } catch {
      return false
    }
  }, [deferredPrompt])

  const dismiss = useCallback(() => {
    setDismissed(true)
    localStorage.setItem('link-party-install-dismissed', new Date().toISOString())
  }, [])

  return {
    canInstall: !isInstalled && !dismissed && deferredPrompt !== null,
    isInstalled,
    install,
    dismiss,
  }
}
