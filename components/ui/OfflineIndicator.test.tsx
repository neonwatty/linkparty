/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OfflineIndicator } from './OfflineIndicator'

// Mock useOnlineStatus hook
vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(),
}))

import { useOnlineStatus } from '@/hooks/useOnlineStatus'

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Renders offline banner when offline
  it('renders the offline banner when user is offline', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)
    render(<OfflineIndicator />)
    expect(screen.getByText(/You're offline/)).toBeInTheDocument()
  })

  // 2. Shows reconnect message when offline
  it('shows reconnect message when offline', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)
    render(<OfflineIndicator />)
    expect(screen.getByText(/changes will sync when you reconnect/)).toBeInTheDocument()
  })

  // 3. Does not render when online
  it('does not render anything when user is online', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(true)
    const { container } = render(<OfflineIndicator />)
    expect(container.firstChild).toBeNull()
  })

  // 4. Renders as sticky positioned element when offline
  it('renders as a sticky element when offline', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)
    const { container } = render(<OfflineIndicator />)
    const banner = container.firstChild as HTMLElement
    expect(banner).toHaveClass('sticky')
  })

  // 5. Contains an SVG icon when offline
  it('contains an SVG icon when offline', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)
    const { container } = render(<OfflineIndicator />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })
})
