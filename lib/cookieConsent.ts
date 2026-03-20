export type ConsentStatus = 'accepted' | 'declined' | null

export const CONSENT_KEY = 'lp-cookie-consent'
export const CONSENT_EVENT = 'cookie-consent-changed'

export function getConsentStatus(): ConsentStatus {
  try {
    const value = localStorage.getItem(CONSENT_KEY)
    if (value === 'accepted' || value === 'declined') return value
    return null
  } catch {
    return null
  }
}

export function setConsentStatus(status: 'accepted' | 'declined'): void {
  try {
    localStorage.setItem(CONSENT_KEY, status)
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: { status } }))
  } catch {
    // Private browsing or SSR
  }
}

export function clearConsentStatus(): void {
  try {
    localStorage.removeItem(CONSENT_KEY)
  } catch {
    // Private browsing or SSR
  }
}
